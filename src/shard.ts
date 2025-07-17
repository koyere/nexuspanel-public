import { Client, GatewayIntentBits } from 'discord.js';
import { EnvironmentConfig } from './config/Environment';
import { Logger } from './utils/Logger';

class ShardProcess {
  private client: Client;
  private logger: Logger;
  private shardId: number;
  private totalShards: number;
  private statsInterval?: NodeJS.Timeout;

  constructor() {
    this.shardId = parseInt(process.env.SHARD_ID || '0');
    this.totalShards = parseInt(process.env.TOTAL_SHARDS || '1');
    this.logger = new Logger(`Shard-${this.shardId}`);
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
      ],
      shards: this.shardId,
      shardCount: this.totalShards
    });

    this.setupEventHandlers();
    this.setupIPC();
  }

  private setupEventHandlers(): void {
    this.client.on('ready', () => {
      this.logger.info(`Shard ${this.shardId} ready as ${this.client.user?.tag}`);
      this.sendToManager({
        type: 'ready',
        data: {
          shardId: this.shardId,
          user: this.client.user?.tag
        }
      });

      // Start sending stats every 30 seconds
      this.startStatsReporting();
    });

    this.client.on('guildCreate', (guild) => {
      this.logger.info(`Shard ${this.shardId} joined guild: ${guild.name} (${guild.id})`);
      this.sendStats();
    });

    this.client.on('guildDelete', (guild) => {
      this.logger.info(`Shard ${this.shardId} left guild: ${guild.name} (${guild.id})`);
      this.sendStats();
    });

    this.client.on('disconnect', () => {
      this.logger.warn(`Shard ${this.shardId} disconnected`);
      this.sendToManager({
        type: 'disconnect',
        data: { shardId: this.shardId }
      });
    });

    this.client.on('error', (error) => {
      this.logger.error(`Shard ${this.shardId} error:`, error);
      this.sendToManager({
        type: 'error',
        data: {
          shardId: this.shardId,
          error: error.message
        }
      });
    });

    this.client.on('warn', (warning) => {
      this.logger.warn(`Shard ${this.shardId} warning:`, warning);
    });

    this.client.on('messageCreate', (message) => {
      // Handle bot commands and interactions here
      // This is where you'd implement your bot's functionality
    });
  }

  private setupIPC(): void {
    process.on('message', (message: any) => {
      this.handleManagerMessage(message);
    });

    process.on('SIGTERM', () => {
      this.logger.info(`Shard ${this.shardId} received SIGTERM, shutting down...`);
      this.shutdown();
    });

    process.on('SIGINT', () => {
      this.logger.info(`Shard ${this.shardId} received SIGINT, shutting down...`);
      this.shutdown();
    });
  }

  private handleManagerMessage(message: any): void {
    switch (message.type) {
      case 'shutdown':
        this.logger.info(`Shard ${this.shardId} received shutdown command`);
        this.shutdown();
        break;

      case 'restart':
        this.logger.info(`Shard ${this.shardId} received restart command`);
        this.restart();
        break;

      case 'getStats':
        this.sendStats();
        break;

      case 'eval':
        this.handleEval(message.data);
        break;

      default:
        this.logger.debug(`Shard ${this.shardId} received unknown message:`, message);
    }
  }

  private async handleEval(data: any): Promise<void> {
    try {
      // Security note: This should only be used for debugging and should be secured
      if (!EnvironmentConfig.isProduction()) {
        const result = eval(data.code);
        this.sendToManager({
          type: 'evalResult',
          data: {
            shardId: this.shardId,
            result: result
          }
        });
      }
    } catch (error) {
      this.sendToManager({
        type: 'evalError',
        data: {
          shardId: this.shardId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  private startStatsReporting(): void {
    this.statsInterval = setInterval(() => {
      this.sendStats();
    }, 30000); // Every 30 seconds
  }

  private sendStats(): void {
    const stats = {
      shardId: this.shardId,
      guilds: this.client.guilds.cache.size,
      users: this.client.users.cache.size,
      ping: this.client.ws.ping,
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
      uptime: process.uptime()
    };

    this.sendToManager({
      type: 'stats',
      data: stats
    });
  }

  private sendToManager(message: any): void {
    if (process.send) {
      process.send(message);
    }
  }

  private async restart(): Promise<void> {
    try {
      this.logger.info(`Restarting shard ${this.shardId}...`);
      await this.client.destroy();
      await this.start();
    } catch (error) {
      this.logger.error(`Failed to restart shard ${this.shardId}:`, error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    try {
      this.logger.info(`Shutting down shard ${this.shardId}...`);
      
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
      }

      await this.client.destroy();
      this.logger.info(`Shard ${this.shardId} shutdown complete`);
      process.exit(0);
    } catch (error) {
      this.logger.error(`Error shutting down shard ${this.shardId}:`, error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      this.logger.info(`Starting shard ${this.shardId}/${this.totalShards}...`);
      await this.client.login(EnvironmentConfig.getDiscordToken());
    } catch (error) {
      this.logger.error(`Failed to start shard ${this.shardId}:`, error);
      throw error;
    }
  }
}

// Start the shard
const shard = new ShardProcess();
shard.start().catch((error) => {
  console.error(`Fatal error starting shard ${process.env.SHARD_ID}:`, error);
  process.exit(1);
});