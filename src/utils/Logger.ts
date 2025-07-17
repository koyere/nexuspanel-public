import winston from 'winston';
import { EnvironmentConfig } from '../config/Environment';

export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
    this.logger = winston.createLogger({
      level: EnvironmentConfig.getLogLevel(),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }: any) => {
          return JSON.stringify({
            timestamp,
            level,
            context: this.context,
            message,
            stack,
            ...meta
          });
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message }: any) => {
              return `${timestamp} [${this.context}] ${level}: ${message}`;
            })
          )
        }),
        new winston.transports.File({
          filename: '/opt/nexus-panel/bot/logs/error.log',
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: '/opt/nexus-panel/bot/logs/combined.log',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5
        })
      ]
    });
  }

  info(message: string, ...meta: any[]): void {
    this.logger.info(message, ...meta);
  }

  warn(message: string, ...meta: any[]): void {
    this.logger.warn(message, ...meta);
  }

  error(message: string, error?: Error | any, ...meta: any[]): void {
    this.logger.error(message, { error, ...meta });
  }

  debug(message: string, ...meta: any[]): void {
    this.logger.debug(message, ...meta);
  }

  verbose(message: string, ...meta: any[]): void {
    this.logger.verbose(message, ...meta);
  }
}