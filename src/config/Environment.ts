import { config } from 'dotenv';
import { BotConfig, BotMode } from '../core/BotManager';

config();

export class EnvironmentConfig {
  static load(): BotConfig {
    const requiredEnvVars = [
      'DISCORD_BOT_TOKEN',
      'DATABASE_URL'
    ];

    // Check for required environment variables
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    return {
      mode: (process.env.BOT_MODE as BotMode) || 'standalone',
      sharding: {
        enabled: process.env.SHARDING_ENABLED === 'true',
        shardsPerCluster: parseInt(process.env.SHARDS_PER_CLUSTER || '1'),
        maxGuildsPerShard: parseInt(process.env.MAX_GUILDS_PER_SHARD || '2000')
      },
      api: {
        port: parseInt(process.env.BOT_API_PORT || '3002'),
        host: process.env.BOT_API_HOST || '0.0.0.0',
        cors: process.env.CORS_ORIGINS?.split(',') || ['*']
      },
      database: {
        url: process.env.DATABASE_URL!,
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10')
      },
      monitoring: {
        enabled: process.env.MONITORING_ENABLED === 'true',
        metricsPort: parseInt(process.env.METRICS_PORT || '9090')
      }
    };
  }

  static getDiscordToken(): string {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      throw new Error('DISCORD_BOT_TOKEN is required');
    }
    return token;
  }

  static getInternalApiKey(): string {
    const key = process.env.BOT_INTERNAL_API_KEY;
    if (!key) {
      throw new Error('BOT_INTERNAL_API_KEY is required');
    }
    return key;
  }

  static getBackendApiUrl(): string {
    return process.env.BACKEND_API_URL || 'https://api.nexus-panel.com';
  }

  static getPanelVpsIp(): string {
    return process.env.PANEL_VPS_IP || '185.73.243.34';
  }

  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  static getLogLevel(): string {
    return process.env.LOG_LEVEL || 'info';
  }
}