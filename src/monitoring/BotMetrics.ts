import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';

export type BotActionType = 'ready' | 'guild_join' | 'guild_leave' | 'command' | 'error' | 'message';

export interface ShardMetrics {
  shardId: number;
  guilds: number;
  users: number;
  ping: number;
  status: 'ready' | 'connecting' | 'disconnected' | 'error';
  memory: number;
  events: Map<string, number>;
  lastActivity: Date;
}

export interface BotMetricsReport {
  totalActions: number;
  successRate: number;
  shardsInfo: ShardMetrics[];
  resourceUsage: {
    memory: NodeJS.MemoryUsage;
    uptime: number;
    cpu: number;
  };
  alertsActive: string[];
}

export class BotMetrics extends EventEmitter {
  private metrics: Map<string, number> = new Map();
  private shardMetrics: Map<number, ShardMetrics> = new Map();
  private logger: Logger;
  private startTime: Date;
  private alertThresholds: Map<string, number> = new Map();

  constructor() {
    super();
    this.logger = new Logger('BotMetrics');
    this.startTime = new Date();
    this.setupDefaultThresholds();
    this.initializeMetrics();
  }

  private setupDefaultThresholds(): void {
    this.alertThresholds.set('memory_usage_percent', 85);
    this.alertThresholds.set('response_time_ms', 5000);
    this.alertThresholds.set('error_rate_percent', 5);
    this.alertThresholds.set('guild_count_per_shard', 1800);
  }

  private initializeMetrics(): void {
    // Initialize basic metrics
    this.metrics.set('actions.total', 0);
    this.metrics.set('actions.success', 0);
    this.metrics.set('actions.failed', 0);
    this.metrics.set('guilds.total', 0);
    this.metrics.set('users.total', 0);
    this.metrics.set('commands.total', 0);
    this.metrics.set('messages.total', 0);
    this.metrics.set('shards.total', 0);
    this.metrics.set('shards.ready', 0);
    this.metrics.set('uptime_seconds', 0);
  }

  public trackShardEvent(shardId: number, event: string): void {
    if (!this.shardMetrics.has(shardId)) {
      this.shardMetrics.set(shardId, {
        shardId,
        guilds: 0,
        users: 0,
        ping: 0,
        status: 'connecting',
        memory: 0,
        events: new Map(),
        lastActivity: new Date()
      });
    }

    const shard = this.shardMetrics.get(shardId)!;
    shard.events.set(event, (shard.events.get(event) || 0) + 1);
    shard.lastActivity = new Date();

    // Update status based on event
    switch (event) {
      case 'ready':
        shard.status = 'ready';
        break;
      case 'disconnected':
        shard.status = 'disconnected';
        break;
      case 'error':
        shard.status = 'error';
        break;
    }

    this.logger.debug(`Shard ${shardId} event: ${event}`);
    this.emit('shardEvent', shardId, event);
  }

  public updateShardMetrics(shardId: number, guilds: number, users: number, ping: number, memory: number): void {
    if (!this.shardMetrics.has(shardId)) {
      this.trackShardEvent(shardId, 'created');
    }

    const shard = this.shardMetrics.get(shardId)!;
    shard.guilds = guilds;
    shard.users = users;
    shard.ping = ping;
    shard.memory = memory;
    shard.lastActivity = new Date();

    // Check alerts
    this.checkShardAlerts(shardId, shard);
  }

  private checkShardAlerts(shardId: number, shard: ShardMetrics): void {
    const maxGuildsPerShard = this.alertThresholds.get('guild_count_per_shard') || 1800;
    const maxMemoryPercent = this.alertThresholds.get('memory_usage_percent') || 85;
    const maxResponseTime = this.alertThresholds.get('response_time_ms') || 5000;

    if (shard.guilds >= maxGuildsPerShard) {
      this.emit('alert', `Shard ${shardId} approaching guild limit: ${shard.guilds}/${maxGuildsPerShard}`);
    }

    if (shard.memory > maxMemoryPercent) {
      this.emit('alert', `Shard ${shardId} high memory usage: ${shard.memory}%`);
    }

    if (shard.ping > maxResponseTime) {
      this.emit('alert', `Shard ${shardId} high response time: ${shard.ping}ms`);
    }
  }

  public trackBotAction(action: BotActionType, success: boolean): void {
    this.incrementMetric(`actions.${action}.total`);
    this.incrementMetric('actions.total');

    if (success) {
      this.incrementMetric(`actions.${action}.success`);
      this.incrementMetric('actions.success');
    } else {
      this.incrementMetric(`actions.${action}.failed`);
      this.incrementMetric('actions.failed');
    }

    this.logger.debug(`Bot action: ${action} - ${success ? 'success' : 'failed'}`);
  }

  public trackCommand(command: string, success: boolean, executionTime: number): void {
    this.incrementMetric('commands.total');
    this.incrementMetric(`commands.${command}.total`);

    if (success) {
      this.incrementMetric(`commands.${command}.success`);
    } else {
      this.incrementMetric(`commands.${command}.failed`);
    }

    this.setMetric(`commands.${command}.avg_execution_time`, executionTime);
    this.trackBotAction('command', success);
  }

  public trackMessage(): void {
    this.incrementMetric('messages.total');
    this.trackBotAction('message', true);
  }

  private incrementMetric(key: string): void {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
  }

  private setMetric(key: string, value: number): void {
    this.metrics.set(key, value);
  }

  public getMetric(key: string): number {
    return this.metrics.get(key) || 0;
  }

  public getAllMetrics(): Map<string, number> {
    return new Map(this.metrics);
  }

  public calculateSuccessRate(): number {
    const total = this.getMetric('actions.total');
    const success = this.getMetric('actions.success');
    return total > 0 ? (success / total) * 100 : 0;
  }

  public getResourceUsage(): any {
    const memoryUsage = process.memoryUsage();
    const uptimeSeconds = Math.floor(process.uptime());
    
    return {
      memory: memoryUsage,
      uptime: uptimeSeconds,
      cpu: process.cpuUsage(),
      memoryUsagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    };
  }

  public getActiveAlerts(): string[] {
    const alerts: string[] = [];
    const resourceUsage = this.getResourceUsage();
    
    // Memory alerts
    if (resourceUsage.memoryUsagePercent > (this.alertThresholds.get('memory_usage_percent') || 85)) {
      alerts.push(`High memory usage: ${resourceUsage.memoryUsagePercent.toFixed(1)}%`);
    }

    // Error rate alerts
    const errorRate = 100 - this.calculateSuccessRate();
    if (errorRate > (this.alertThresholds.get('error_rate_percent') || 5)) {
      alerts.push(`High error rate: ${errorRate.toFixed(1)}%`);
    }

    // Shard alerts
    for (const [shardId, shard] of this.shardMetrics) {
      if (shard.status === 'error') {
        alerts.push(`Shard ${shardId} in error state`);
      }
      if (shard.status === 'disconnected') {
        alerts.push(`Shard ${shardId} disconnected`);
      }
    }

    return alerts;
  }

  public exportPrometheusMetrics(): string {
    let output = '';
    
    // Basic metrics
    for (const [key, value] of this.metrics) {
      const metricName = `nexus_bot_${key.replace(/\./g, '_')}`;
      output += `${metricName} ${value}\n`;
    }

    // Resource metrics
    const resourceUsage = this.getResourceUsage();
    output += `nexus_bot_memory_heap_used_bytes ${resourceUsage.memory.heapUsed}\n`;
    output += `nexus_bot_memory_heap_total_bytes ${resourceUsage.memory.heapTotal}\n`;
    output += `nexus_bot_uptime_seconds ${resourceUsage.uptime}\n`;
    output += `nexus_bot_memory_usage_percent ${resourceUsage.memoryUsagePercent}\n`;

    // Shard metrics
    for (const [shardId, shard] of this.shardMetrics) {
      output += `nexus_bot_shard_guilds{shard_id="${shardId}"} ${shard.guilds}\n`;
      output += `nexus_bot_shard_users{shard_id="${shardId}"} ${shard.users}\n`;
      output += `nexus_bot_shard_ping{shard_id="${shardId}"} ${shard.ping}\n`;
      output += `nexus_bot_shard_memory{shard_id="${shardId}"} ${shard.memory}\n`;
      output += `nexus_bot_shard_status{shard_id="${shardId}",status="${shard.status}"} 1\n`;
    }

    return output;
  }

  public getMetricsForAdmin(): BotMetricsReport {
    return {
      totalActions: this.getMetric('actions.total'),
      successRate: this.calculateSuccessRate(),
      shardsInfo: Array.from(this.shardMetrics.values()),
      resourceUsage: this.getResourceUsage(),
      alertsActive: this.getActiveAlerts()
    };
  }

  public updateUptime(): void {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    this.setMetric('uptime_seconds', uptimeSeconds);
  }

  public reset(): void {
    this.metrics.clear();
    this.shardMetrics.clear();
    this.initializeMetrics();
    this.logger.info('Metrics reset');
  }
}