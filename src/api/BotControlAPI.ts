import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { NexusBotManager } from '../core/BotManager';
import { EnvironmentConfig } from '../config/Environment';
import { Logger } from '../utils/Logger';
import jwt from 'jsonwebtoken';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export class BotControlAPI {
  private app: Express;
  private botManager: NexusBotManager;
  private logger: Logger;
  private config: any;

  constructor(botManager: NexusBotManager) {
    this.app = express();
    this.botManager = botManager;
    this.logger = new Logger('BotControlAPI');
    this.config = EnvironmentConfig.load();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: this.config.api.cors,
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      this.logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
      next();
    });

    // Authentication middleware
    this.app.use('/api', this.authenticateRequest.bind(this));
  }

  private authenticateRequest(req: Request, res: Response, next: NextFunction): void {
    // Skip auth for health check
    if (req.path === '/health') {
      return next();
    }

    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    // Check API key
    if (apiKey && apiKey === EnvironmentConfig.getInternalApiKey()) {
      return next();
    }

    // Check JWT token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        jwt.verify(token, EnvironmentConfig.getInternalApiKey());
        return next();
      } catch (error) {
        this.logger.warn('Invalid JWT token:', error);
      }
    }

    this.sendErrorResponse(res, 401, 'Unauthorized');
  }

  private setupRoutes(): void {
    // Health check (no auth required)
    this.app.get('/health', this.getHealth.bind(this));

    // Emergency controls
    this.app.post('/api/emergency/stop', this.handleEmergencyStop.bind(this));
    this.app.post('/api/emergency/pause', this.handlePause.bind(this));
    this.app.post('/api/emergency/resume', this.handleResume.bind(this));
    this.app.post('/api/emergency/restart', this.handleRestart.bind(this));

    // Statistics and monitoring
    this.app.get('/api/stats', this.getStats.bind(this));
    this.app.get('/api/metrics', this.getMetrics.bind(this));
    this.app.get('/api/metrics/prometheus', this.getPrometheusMetrics.bind(this));
    this.app.get('/api/logs', this.getLogs.bind(this));

    // Sharding controls
    this.app.get('/api/shards', this.getShardInfo.bind(this));
    this.app.post('/api/shards/rebalance', this.rebalanceShards.bind(this));
    this.app.post('/api/shards/scale', this.scaleShards.bind(this));
    this.app.get('/api/shards/:shardId', this.getShardDetails.bind(this));
    this.app.post('/api/shards/:shardId/restart', this.restartShard.bind(this));

    // Bot configuration
    this.app.get('/api/config', this.getConfig.bind(this));
    this.app.post('/api/config', this.updateConfig.bind(this));

    // Guild management
    this.app.get('/api/guilds', this.getGuilds.bind(this));
    this.app.get('/api/guilds/:guildId', this.getGuildDetails.bind(this));
    this.app.post('/api/guilds/:guildId/leave', this.leaveGuild.bind(this));

    // Error handling
    this.app.use(this.errorHandler.bind(this));
  }

  private async getHealth(req: Request, res: Response): Promise<void> {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      mode: this.botManager.getMode(),
      guilds: this.botManager.getGuildCountCurrent(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };

    res.json(health);
  }

  private async handleEmergencyStop(req: Request, res: Response): Promise<void> {
    try {
      this.logger.warn('Emergency stop requested via API');
      await this.botManager.emergencyStop();
      this.sendSuccessResponse(res, { message: 'Bot stopped successfully' });
    } catch (error) {
      this.logger.error('Emergency stop failed:', error);
      this.sendErrorResponse(res, 500, 'Failed to stop bot', error);
    }
  }

  private async handlePause(req: Request, res: Response): Promise<void> {
    try {
      await this.botManager.pause();
      this.sendSuccessResponse(res, { message: 'Bot paused successfully' });
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to pause bot', error);
    }
  }

  private async handleResume(req: Request, res: Response): Promise<void> {
    try {
      await this.botManager.resume();
      this.sendSuccessResponse(res, { message: 'Bot resumed successfully' });
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to resume bot', error);
    }
  }

  private async handleRestart(req: Request, res: Response): Promise<void> {
    try {
      this.logger.info('Bot restart requested via API');
      // Implement restart logic
      this.sendSuccessResponse(res, { message: 'Bot restart initiated' });
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to restart bot', error);
    }
  }

  private async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = {
        mode: this.botManager.getMode(),
        guilds: this.botManager.getGuildCountCurrent(),
        users: this.botManager.getUserCount(),
        shards: this.botManager.getShardInfo(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        lastActivity: this.botManager.getLastActivity(),
        metrics: this.botManager.getMetrics().getMetricsForAdmin()
      };

      this.sendSuccessResponse(res, stats);
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to get stats', error);
    }
  }

  private async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = this.botManager.getMetrics().getMetricsForAdmin();
      this.sendSuccessResponse(res, metrics);
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to get metrics', error);
    }
  }

  private async getPrometheusMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = this.botManager.getMetrics().exportPrometheusMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to get Prometheus metrics', error);
    }
  }

  private async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { lines = 100, level = 'info' } = req.query;
      // Implement log retrieval logic
      this.sendSuccessResponse(res, { 
        message: 'Log retrieval not implemented yet',
        requested: { lines, level }
      });
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to get logs', error);
    }
  }

  private async getShardInfo(req: Request, res: Response): Promise<void> {
    try {
      const shardInfo = this.botManager.getShardInfo();
      const detailedInfo = shardInfo.map((shard: any) => ({
        ...shard,
        metrics: this.botManager.getMetrics().getAllMetrics()
      }));

      this.sendSuccessResponse(res, detailedInfo);
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to get shard info', error);
    }
  }

  private async rebalanceShards(req: Request, res: Response): Promise<void> {
    try {
      // Implement shard rebalancing logic
      this.sendSuccessResponse(res, { message: 'Shard rebalancing not implemented yet' });
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to rebalance shards', error);
    }
  }

  private async scaleShards(req: Request, res: Response): Promise<void> {
    try {
      const { targetShards } = req.body;
      // Implement shard scaling logic
      this.sendSuccessResponse(res, { 
        message: 'Shard scaling not implemented yet',
        targetShards 
      });
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to scale shards', error);
    }
  }

  private async getShardDetails(req: Request, res: Response): Promise<void> {
    try {
      const { shardId } = req.params;
      // Implement shard details retrieval
      this.sendSuccessResponse(res, { 
        message: 'Shard details not implemented yet',
        shardId 
      });
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to get shard details', error);
    }
  }

  private async restartShard(req: Request, res: Response): Promise<void> {
    try {
      const { shardId } = req.params;
      // Implement shard restart logic
      this.sendSuccessResponse(res, { 
        message: 'Shard restart not implemented yet',
        shardId 
      });
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to restart shard', error);
    }
  }

  private async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = {
        mode: this.botManager.getMode(),
        sharding: this.config.sharding,
        monitoring: this.config.monitoring,
        // Don't expose sensitive information
      };
      this.sendSuccessResponse(res, config);
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to get config', error);
    }
  }

  private async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      // Implement config update logic
      this.sendSuccessResponse(res, { message: 'Config update not implemented yet' });
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to update config', error);
    }
  }

  private async getGuilds(req: Request, res: Response): Promise<void> {
    try {
      const client = this.botManager.getClient();
      if (!client) {
        return this.sendErrorResponse(res, 503, 'Bot not ready');
      }

      const guilds = client.guilds.cache.map(guild => ({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        joinedAt: guild.joinedAt
      }));

      this.sendSuccessResponse(res, guilds);
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to get guilds', error);
    }
  }

  private async getGuildDetails(req: Request, res: Response): Promise<void> {
    try {
      const { guildId } = req.params;
      const client = this.botManager.getClient();
      
      if (!client) {
        return this.sendErrorResponse(res, 503, 'Bot not ready');
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return this.sendErrorResponse(res, 404, 'Guild not found');
      }

      const guildDetails = {
        id: guild.id,
        name: guild.name,
        description: guild.description,
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        joinedAt: guild.joinedAt,
        features: guild.features,
        channels: guild.channels.cache.size,
        roles: guild.roles.cache.size
      };

      this.sendSuccessResponse(res, guildDetails);
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to get guild details', error);
    }
  }

  private async leaveGuild(req: Request, res: Response): Promise<void> {
    try {
      const { guildId } = req.params;
      const client = this.botManager.getClient();
      
      if (!client) {
        return this.sendErrorResponse(res, 503, 'Bot not ready');
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return this.sendErrorResponse(res, 404, 'Guild not found');
      }

      await guild.leave();
      this.logger.info(`Left guild: ${guild.name} (${guild.id}) via API`);
      this.sendSuccessResponse(res, { message: `Left guild: ${guild.name}` });
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to leave guild', error);
    }
  }

  private sendSuccessResponse<T>(res: Response, data: T): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
    res.json(response);
  }

  private sendErrorResponse(res: Response, status: number, message: string, error?: any): void {
    const response: ApiResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    };

    if (error && !EnvironmentConfig.isProduction()) {
      response.error += ` - ${error.message || error}`;
    }

    res.status(status).json(response);
  }

  private errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
    this.logger.error('API Error:', error);
    this.sendErrorResponse(res, 500, 'Internal server error');
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      const server = this.app.listen(this.config.api.port, this.config.api.host, () => {
        this.logger.info(`Bot Control API listening on ${this.config.api.host}:${this.config.api.port}`);
        resolve();
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        this.logger.info('Shutting down API server...');
        server.close(() => {
          this.logger.info('API server shut down');
        });
      });
    });
  }

  public getApp(): Express {
    return this.app;
  }
}