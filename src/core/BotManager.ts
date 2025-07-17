import { Client, GatewayIntentBits, ShardingManager, Collection } from 'discord.js';
import { EventEmitter } from 'events';
import { EnvironmentConfig } from '../config/Environment';
import { BotMetrics } from '../monitoring/BotMetrics';
import { Logger } from '../utils/Logger';

export type BotMode = 'standalone' | 'sharded';

export interface BotConfig {
  mode: BotMode;
  sharding: {
    enabled: boolean;
    shardsPerCluster: number;
    maxGuildsPerShard: number;
  };
  api: {
    port: number;
    host: string;
    cors: string[];
  };
  database: {
    url: string;
    maxConnections: number;
  };
  monitoring: {
    enabled: boolean;
    metricsPort: number;
  };
}

export class NexusBotManager extends EventEmitter {
  private mode: BotMode;
  private config: BotConfig;
  private client?: Client;
  private shardManager?: ShardingManager;
  private metrics: BotMetrics;
  private logger: Logger;
  private startTime: Date;
  private eventHandlers: Collection<string, any>;

  constructor() {
    super();
    this.config = EnvironmentConfig.load();
    this.mode = this.detectOptimalMode();
    this.metrics = new BotMetrics();
    this.logger = new Logger('BotManager');
    this.startTime = new Date();
    this.eventHandlers = new Collection();
    
    this.logger.info(`Initializing NexusBotManager in ${this.mode} mode`);
  }

  private detectOptimalMode(): BotMode {
    const guildCount = this.getGuildCount();
    const forcedMode = this.config.mode;
    
    if (forcedMode && ['standalone', 'sharded'].includes(forcedMode)) {
      this.logger.info(`Using forced mode: ${forcedMode}`);
      return forcedMode;
    }
    
    const optimalMode = guildCount >= 1800 ? 'sharded' : 'standalone';
    this.logger.info(`Auto-detected optimal mode: ${optimalMode} (guilds: ${guildCount})`);
    return optimalMode;
  }

  private getGuildCount(): number {
    // This would normally fetch from database or Discord API
    // For now, return 0 as default
    return 0;
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing bot manager...');
      
      if (this.mode === 'standalone') {
        await this.initializeStandalone();
      } else {
        await this.initializeSharded();
      }
      
      this.logger.info('Bot manager initialized successfully');
      this.emit('ready');
    } catch (error) {
      this.logger.error('Failed to initialize bot manager:', error);
      throw error;
    }
  }

  private async initializeStandalone(): Promise<void> {
    this.logger.info('Initializing standalone mode...');
    
    this.client = new Client({
      intents: this.getRequiredIntents(),
      shards: 'auto'
    });

    this.registerEventHandlers();
    await this.client.login(process.env.DISCORD_BOT_TOKEN);
  }

  private async initializeSharded(): Promise<void> {
    this.logger.info('Initializing sharded mode...');
    
    this.shardManager = new ShardingManager('./dist/shard.js', {
      totalShards: 'auto',
      shardList: 'auto',
      mode: 'process',
      token: process.env.DISCORD_BOT_TOKEN
    });

    this.setupShardManagement();
    await this.shardManager.spawn();
  }

  private getRequiredIntents(): GatewayIntentBits[] {
    return [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates
    ];
  }

  private registerEventHandlers(): void {
    if (!this.client) return;

    this.client.on('ready', () => {
      this.logger.info(`Bot ready as ${this.client?.user?.tag}`);
      this.metrics.trackBotAction('ready', true);
    });

    this.client.on('guildCreate', (guild) => {
      this.logger.info(`Joined guild: ${guild.name} (${guild.id})`);
      this.metrics.trackBotAction('guild_join', true);
    });

    this.client.on('guildDelete', (guild) => {
      this.logger.info(`Left guild: ${guild.name} (${guild.id})`);
      this.metrics.trackBotAction('guild_leave', true);
    });

    this.client.on('error', (error) => {
      this.logger.error('Discord client error:', error);
      this.metrics.trackBotAction('error', false);
    });
  }

  private setupShardManagement(): void {
    if (!this.shardManager) return;

    this.shardManager.on('shardCreate', (shard) => {
      this.logger.info(`Shard ${shard.id} created`);
      this.metrics.trackShardEvent(shard.id, 'created');
    });

    this.shardManager.on('shardReady', (shard: any) => {
      this.logger.info(`Shard ${shard.id} ready`);
      this.metrics.trackShardEvent(shard.id, 'ready');
    });

    this.shardManager.on('shardDisconnect', (shard: any) => {
      this.logger.warn(`Shard ${shard.id} disconnected`);
      this.metrics.trackShardEvent(shard.id, 'disconnected');
    });

    this.shardManager.on('shardError', (shard: any, error: any) => {
      this.logger.error(`Shard ${shard.id} error:`, error);
      this.metrics.trackShardEvent(shard.id, 'error');
    });
  }

  public async emergencyStop(): Promise<void> {
    this.logger.warn('Emergency stop initiated');
    
    if (this.client) {
      await this.client.destroy();
    }
    
    if (this.shardManager) {
      this.shardManager.shards.forEach(shard => {
        shard.kill();
      });
    }
    
    this.logger.info('Emergency stop completed');
  }

  public async pause(): Promise<void> {
    this.logger.info('Pausing bot operations');
    // Implementation for pausing bot operations
  }

  public async resume(): Promise<void> {
    this.logger.info('Resuming bot operations');
    // Implementation for resuming bot operations
  }

  public getMode(): BotMode {
    return this.mode;
  }

  public getGuildCountCurrent(): number {
    if (this.client) {
      return this.client.guilds.cache.size;
    }
    return 0;
  }

  public getUserCount(): number {
    if (this.client) {
      return this.client.users.cache.size;
    }
    return 0;
  }

  public getShardInfo(): any {
    if (this.mode === 'sharded' && this.shardManager) {
      return Array.from(this.shardManager.shards.values()).map(shard => ({
        id: shard.id,
        ready: shard.ready,
        status: shard.process?.pid ? 'running' : 'stopped'
      }));
    }
    return [];
  }

  public getLastActivity(): Date {
    return this.startTime;
  }

  public getMetrics(): BotMetrics {
    return this.metrics;
  }

  public getClient(): Client | undefined {
    return this.client;
  }

  public getShardManager(): ShardingManager | undefined {
    return this.shardManager;
  }
}