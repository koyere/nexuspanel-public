// nexus-panel/bot/src/sharding/ShardManager.ts

import { ShardingManager } from 'discord.js';
import path from 'path';

export class NexusShardManager {
  public manager: ShardingManager;  // Made public for access
  private startTime: Date;

  constructor() {
    // Path to the compiled bot entry point
    const botPath = path.join(__dirname, '../index.js');
    
    this.manager = new ShardingManager(botPath, {
      token: process.env.DISCORD_BOT_TOKEN!,
      totalShards: 'auto', // Discord calculates automatically based on guild count
      mode: 'process',     // Each shard runs in separate process
      silent: false,       // Show shard logs
      respawn: true,       // Auto-restart failed shards
      shardArgs: process.argv.slice(2),
      execArgv: process.execArgv
    });

    this.startTime = new Date();
    
    console.log('🤖 Nexus Panel Shard Manager initialized');
    console.log(`📊 Token: ${process.env.DISCORD_BOT_TOKEN ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🔧 Mode: process`);
    console.log(`🔄 Respawn: ${this.manager.respawn}`);
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 Starting Nexus Panel Bot with Auto-Sharding...');
      
      this.setupEventHandlers();
      
      // Spawn all shards
      await this.manager.spawn();
      
      console.log(`✅ All shards spawned successfully in ${Date.now() - this.startTime.getTime()}ms`);
      
      // Setup periodic health checks
      this.setupHealthChecks();
      
    } catch (error) {
      console.error('❌ Failed to start shard manager:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    // Shard creation events
    this.manager.on('shardCreate', (shard) => {
      console.log(`🚀 Shard ${shard.id} launched`);
      
      // Shard ready event
      shard.on('ready', () => {
        console.log(`✅ Shard ${shard.id} ready`);
      });
      
      // Shard disconnect event
      shard.on('disconnect', () => {
        console.log(`⚠️ Shard ${shard.id} disconnected`);
      });
      
      // Shard reconnecting event
      shard.on('reconnecting', () => {
        console.log(`🔄 Shard ${shard.id} reconnecting`);
      });
      
      // Shard error event
      shard.on('error', (error) => {
        console.error(`❌ Shard ${shard.id} error:`, error);
      });
      
      // Shard death event
      shard.on('death', () => {
        console.log(`💀 Shard ${shard.id} died`);
      });
    });
  }

  private setupHealthChecks(): void {
    // Health check every 5 minutes
    setInterval(async () => {
      try {
        const promises = Array.from(this.manager.shards.values()).map(async (shard) => {
          try {
            const result = await shard.eval('this.ws.ping');
            return {
              shardId: shard.id,
              ping: result,
              status: 'healthy'
            };
          } catch (error) {
            return {
              shardId: shard.id,
              ping: -1,
              status: 'unhealthy',
              error: error
            };
          }
        });

        const results = await Promise.all(promises);
        
        const healthyShards = results.filter(r => r.status === 'healthy');
        const unhealthyShards = results.filter(r => r.status === 'unhealthy');
        
        console.log(`📊 Health Check: ${healthyShards.length}/${results.length} shards healthy`);
        
        if (unhealthyShards.length > 0) {
          console.warn(`⚠️ Unhealthy shards: ${unhealthyShards.map(s => s.shardId).join(', ')}`);
        }
        
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  async getStats(): Promise<any> {
    try {
      const promises = Array.from(this.manager.shards.values()).map(async (shard) => {
        try {
          const result = await shard.eval(`
            [
              this.guilds.cache.size,
              this.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
              this.ws.ping
            ]
          `) as [number, number, number];
          
          const [guilds, users, ping] = result;
          
          return {
            shardId: shard.id,
            guilds,
            users,
            ping,
            status: 'online'
          };
        } catch (error) {
          return {
            shardId: shard.id,
            guilds: 0,
            users: 0,
            ping: -1,
            status: 'offline',
            error: error
          };
        }
      });

      const results = await Promise.all(promises);
      
      const totalGuilds = results.reduce((acc, r) => acc + r.guilds, 0);
      const totalUsers = results.reduce((acc, r) => acc + r.users, 0);
      const averagePing = results.filter(r => r.ping > 0).reduce((acc, r, _, arr) => acc + r.ping / arr.length, 0);
      
      return {
        totalShards: this.manager.shards.size,
        totalGuilds,
        totalUsers,
        averagePing: Math.round(averagePing),
        uptime: Date.now() - this.startTime.getTime(),
        shards: results
      };
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      throw error;
    }
  }

  async broadcastEval(script: string): Promise<any[]> {
    try {
      return await this.manager.broadcastEval((client) => eval(script));
    } catch (error) {
      console.error('❌ Broadcast eval failed:', error);
      throw error;
    }
  }

  async restart(): Promise<void> {
    try {
      console.log('🔄 Restarting all shards...');
      await this.manager.respawnAll();
      console.log('✅ All shards restarted');
    } catch (error) {
      console.error('❌ Failed to restart shards:', error);
      throw error;
    }
  }
}