import { fork, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { BotMetrics } from '../monitoring/BotMetrics';

export interface ShardInfo {
  id: number;
  process?: ChildProcess;
  ready: boolean;
  guilds: number;
  users: number;
  ping: number;
  memory: number;
  status: 'starting' | 'ready' | 'disconnected' | 'error' | 'stopped';
  lastActivity: Date;
}

export class AutoShardManager extends EventEmitter {
  private currentShards: number = 1;
  private maxGuildsPerShard: number;
  private shardProcesses: Map<number, ShardInfo> = new Map();
  private logger: Logger;
  private metrics: BotMetrics;
  private scalingInProgress: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(maxGuildsPerShard: number = 1800, metrics: BotMetrics) {
    super();
    this.maxGuildsPerShard = maxGuildsPerShard;
    this.logger = new Logger('AutoShardManager');
    this.metrics = metrics;
    this.setupHealthChecking();
  }

  private setupHealthChecking(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
    for (const [shardId, shard] of this.shardProcesses) {
      if (shard.process && !shard.process.killed) {
        // Check if shard is responsive
        const timeSinceLastActivity = Date.now() - shard.lastActivity.getTime();
        if (timeSinceLastActivity > 300000) { // 5 minutes
          this.logger.warn(`Shard ${shardId} appears unresponsive, restarting...`);
          await this.restartShard(shardId);
        }
      } else if (shard.status !== 'stopped') {
        this.logger.warn(`Shard ${shardId} process died, respawning...`);
        await this.respawnShard(shardId);
      }
    }
  }

  public async checkScalingNeeds(): Promise<void> {
    if (this.scalingInProgress) {
      this.logger.debug('Scaling already in progress, skipping check');
      return;
    }

    const totalGuilds = await this.getTotalGuildCount();
    const requiredShards = Math.ceil(totalGuilds / this.maxGuildsPerShard);
    
    this.logger.debug(`Guild count: ${totalGuilds}, Current shards: ${this.currentShards}, Required shards: ${requiredShards}`);

    if (requiredShards > this.currentShards) {
      await this.scaleUp(requiredShards);
    } else if (requiredShards < this.currentShards && this.currentShards > 1) {
      await this.scaleDown(requiredShards);
    }
  }

  private async getTotalGuildCount(): Promise<number> {
    let totalGuilds = 0;
    
    for (const [shardId, shard] of this.shardProcesses) {
      if (shard.ready) {
        totalGuilds += shard.guilds;
      }
    }
    
    return totalGuilds;
  }

  private async scaleUp(targetShards: number): Promise<void> {
    this.scalingInProgress = true;
    this.logger.info(`Scaling up from ${this.currentShards} to ${targetShards} shards`);
    
    try {
      for (let shardId = this.currentShards; shardId < targetShards; shardId++) {
        await this.spawnShard(shardId);
        await this.wait(5000); // 5 seconds between spawns
      }
      
      this.currentShards = targetShards;
      await this.rebalanceGuilds();
      
      this.logger.info(`Successfully scaled up to ${targetShards} shards`);
      this.emit('scaled', { from: this.currentShards, to: targetShards, type: 'up' });
    } catch (error) {
      this.logger.error('Failed to scale up:', error);
      throw error;
    } finally {
      this.scalingInProgress = false;
    }
  }

  private async scaleDown(targetShards: number): Promise<void> {
    this.scalingInProgress = true;
    this.logger.info(`Scaling down from ${this.currentShards} to ${targetShards} shards`);
    
    try {
      // First rebalance guilds to remaining shards
      await this.rebalanceGuilds();
      
      // Then shut down excess shards
      for (let shardId = this.currentShards - 1; shardId >= targetShards; shardId--) {
        await this.stopShard(shardId);
        await this.wait(2000); // 2 seconds between stops
      }
      
      this.currentShards = targetShards;
      
      this.logger.info(`Successfully scaled down to ${targetShards} shards`);
      this.emit('scaled', { from: this.currentShards, to: targetShards, type: 'down' });
    } catch (error) {
      this.logger.error('Failed to scale down:', error);
      throw error;
    } finally {
      this.scalingInProgress = false;
    }
  }

  private async spawnShard(shardId: number): Promise<void> {
    this.logger.info(`Spawning shard ${shardId}`);
    
    const shardInfo: ShardInfo = {
      id: shardId,
      ready: false,
      guilds: 0,
      users: 0,
      ping: 0,
      memory: 0,
      status: 'starting',
      lastActivity: new Date()
    };

    try {
      const shardProcess = fork('./dist/shard.js', [], {
        env: {
          ...process.env,
          SHARD_ID: shardId.toString(),
          TOTAL_SHARDS: this.currentShards.toString(),
          BOT_MODE: 'sharded'
        },
        silent: false
      });

      shardInfo.process = shardProcess;
      this.shardProcesses.set(shardId, shardInfo);

      // Set up shard process event handlers
      this.setupShardEventHandlers(shardId, shardProcess);

      // Wait for shard to be ready
      await this.waitForShardReady(shardId, 60000); // 60 seconds timeout

      this.logger.info(`Shard ${shardId} spawned successfully`);
      this.metrics.trackShardEvent(shardId, 'spawned');
    } catch (error) {
      this.logger.error(`Failed to spawn shard ${shardId}:`, error);
      this.shardProcesses.delete(shardId);
      throw error;
    }
  }

  private setupShardEventHandlers(shardId: number, shardProcess: ChildProcess): void {
    shardProcess.on('message', (message: any) => {
      this.handleShardMessage(shardId, message);
    });

    shardProcess.on('exit', (code, signal) => {
      this.logger.warn(`Shard ${shardId} exited with code ${code}, signal ${signal}`);
      const shard = this.shardProcesses.get(shardId);
      if (shard) {
        shard.status = 'stopped';
        shard.ready = false;
      }
      this.metrics.trackShardEvent(shardId, 'exited');
      
      if (code !== 0 && !signal) {
        this.logger.error(`Shard ${shardId} crashed, scheduling respawn`);
        setTimeout(() => this.respawnShard(shardId), 5000);
      }
    });

    shardProcess.on('error', (error) => {
      this.logger.error(`Shard ${shardId} error:`, error);
      const shard = this.shardProcesses.get(shardId);
      if (shard) {
        shard.status = 'error';
      }
      this.metrics.trackShardEvent(shardId, 'error');
    });
  }

  private handleShardMessage(shardId: number, message: any): void {
    const shard = this.shardProcesses.get(shardId);
    if (!shard) return;

    shard.lastActivity = new Date();

    switch (message.type) {
      case 'ready':
        shard.ready = true;
        shard.status = 'ready';
        this.logger.info(`Shard ${shardId} is ready`);
        this.metrics.trackShardEvent(shardId, 'ready');
        this.emit('shardReady', shardId);
        break;

      case 'stats':
        shard.guilds = message.data.guilds || 0;
        shard.users = message.data.users || 0;
        shard.ping = message.data.ping || 0;
        shard.memory = message.data.memory || 0;
        this.metrics.updateShardMetrics(shardId, shard.guilds, shard.users, shard.ping, shard.memory);
        break;

      case 'disconnect':
        shard.status = 'disconnected';
        shard.ready = false;
        this.logger.warn(`Shard ${shardId} disconnected`);
        this.metrics.trackShardEvent(shardId, 'disconnected');
        break;

      case 'error':
        shard.status = 'error';
        this.logger.error(`Shard ${shardId} reported error:`, message.data);
        this.metrics.trackShardEvent(shardId, 'error');
        break;

      default:
        this.logger.debug(`Unknown message from shard ${shardId}:`, message);
    }
  }

  private async waitForShardReady(shardId: number, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Shard ${shardId} failed to become ready within ${timeout}ms`));
      }, timeout);

      const checkReady = () => {
        const shard = this.shardProcesses.get(shardId);
        if (shard && shard.ready) {
          clearTimeout(timeoutId);
          resolve();
        } else {
          setTimeout(checkReady, 1000);
        }
      };

      checkReady();
    });
  }

  private async respawnShard(shardId: number): Promise<void> {
    this.logger.info(`Respawning shard ${shardId}`);
    
    const shard = this.shardProcesses.get(shardId);
    if (shard && shard.process && !shard.process.killed) {
      shard.process.kill('SIGTERM');
      await this.wait(2000);
    }
    
    this.shardProcesses.delete(shardId);
    await this.spawnShard(shardId);
  }

  private async restartShard(shardId: number): Promise<void> {
    this.logger.info(`Restarting shard ${shardId}`);
    await this.stopShard(shardId);
    await this.wait(2000);
    await this.spawnShard(shardId);
  }

  private async stopShard(shardId: number): Promise<void> {
    this.logger.info(`Stopping shard ${shardId}`);
    
    const shard = this.shardProcesses.get(shardId);
    if (!shard || !shard.process) {
      this.logger.warn(`Shard ${shardId} not found or already stopped`);
      return;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (shard.process && !shard.process.killed) {
          this.logger.warn(`Force killing shard ${shardId}`);
          shard.process.kill('SIGKILL');
        }
        resolve();
      }, 10000); // 10 seconds timeout

      shard.process?.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      shard.process?.kill('SIGTERM');
    });
  }

  private async rebalanceGuilds(): Promise<void> {
    this.logger.info('Rebalancing guilds across shards');
    // Implementation would depend on Discord.js sharding capabilities
    // This is a placeholder for the actual rebalancing logic
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async getAllShardInfo(): Promise<ShardInfo[]> {
    return Array.from(this.shardProcesses.values());
  }

  public async getShardInfo(shardId: number): Promise<ShardInfo | undefined> {
    return this.shardProcesses.get(shardId);
  }

  public async sendToShard(shardId: number, message: any): Promise<void> {
    const shard = this.shardProcesses.get(shardId);
    if (shard && shard.process && !shard.process.killed) {
      shard.process.send(message);
    } else {
      throw new Error(`Shard ${shardId} is not available`);
    }
  }

  public async broadcastToShards(message: any): Promise<void> {
    const promises = Array.from(this.shardProcesses.keys()).map(shardId => 
      this.sendToShard(shardId, message).catch(error => 
        this.logger.error(`Failed to send message to shard ${shardId}:`, error)
      )
    );
    
    await Promise.allSettled(promises);
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down shard manager');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const shutdownPromises = Array.from(this.shardProcesses.keys()).map(shardId => 
      this.stopShard(shardId)
    );
    
    await Promise.allSettled(shutdownPromises);
    this.shardProcesses.clear();
    this.logger.info('Shard manager shutdown complete');
  }

  public getCurrentShardCount(): number {
    return this.currentShards;
  }

  public getMaxGuildsPerShard(): number {
    return this.maxGuildsPerShard;
  }

  public setMaxGuildsPerShard(max: number): void {
    this.maxGuildsPerShard = max;
    this.logger.info(`Updated max guilds per shard to ${max}`);
  }
}