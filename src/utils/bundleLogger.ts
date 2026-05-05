// nexus-panel/bot/src/utils/bundleLogger.ts

/**
 * 📊 BUNDLE LOGGING SYSTEM
 * Specialized logging for bundle operations with structured output
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class BundleLogger {
  private static instance: BundleLogger;
  private logLevel: LogLevel;

  constructor() {
    // Set log level from environment or default to INFO
    const envLevel = process.env.BUNDLE_LOG_LEVEL?.toUpperCase();
    this.logLevel = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  static getInstance(): BundleLogger {
    if (!BundleLogger.instance) {
      BundleLogger.instance = new BundleLogger();
    }
    return BundleLogger.instance;
  }

  /**
   * Log bundle command execution
   */
  logCommand(action: string, context: any) {
    this.log(LogLevel.INFO, `🎁 BUNDLE_COMMAND`, {
      action,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log bundle API calls
   */
  logApiCall(endpoint: string, context: any) {
    this.log(LogLevel.DEBUG, `🔍 BUNDLE_API`, {
      endpoint,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log successful bundle operations
   */
  logSuccess(operation: string, context: any) {
    this.log(LogLevel.INFO, `✅ BUNDLE_SUCCESS`, {
      operation,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log bundle errors
   */
  logError(operation: string, context: any) {
    this.log(LogLevel.ERROR, `❌ BUNDLE_ERROR`, {
      operation,
      ...context,
      error: context.error instanceof Error ? {
        message: context.error.message,
        stack: context.error.stack,
      } : context.error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log button interactions
   */
  logButtonInteraction(buttonId: string, context: any) {
    this.log(LogLevel.DEBUG, `🔘 BUNDLE_BUTTON`, {
      buttonId,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log checkout operations
   */
  logCheckout(status: string, context: any) {
    const level = status === 'error' ? LogLevel.ERROR : LogLevel.INFO;
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '💳';
    
    this.log(level, `${emoji} BUNDLE_CHECKOUT`, {
      status,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, context: any) {
    this.log(LogLevel.DEBUG, `⚡ BUNDLE_PERF`, {
      operation,
      duration_ms: duration,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, prefix: string, data: any) {
    if (level < this.logLevel) return;

    const levelName = LogLevel[level];
    const timestamp = new Date().toISOString();

    // Create structured log entry
    const logEntry = {
      timestamp,
      level: levelName,
      prefix,
      ...data,
    };

    // Output based on log level
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`[${timestamp}] [DEBUG] ${prefix}`, JSON.stringify(logEntry, null, 2));
        break;
      case LogLevel.INFO:
        console.log(`[${timestamp}] [INFO] ${prefix}`, JSON.stringify(logEntry, null, 2));
        break;
      case LogLevel.WARN:
        console.warn(`[${timestamp}] [WARN] ${prefix}`, JSON.stringify(logEntry, null, 2));
        break;
      case LogLevel.ERROR:
        console.error(`[${timestamp}] [ERROR] ${prefix}`, JSON.stringify(logEntry, null, 2));
        break;
    }
  }

  /**
   * Create performance timer
   */
  startTimer(operation: string) {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.logPerformance(operation, duration, {});
    };
  }

  /**
   * Log bundle data for debugging
   */
  logBundleData(bundles: any[], context: any) {
    this.log(LogLevel.DEBUG, `📊 BUNDLE_DATA`, {
      bundleCount: bundles.length,
      bundles: bundles.map(b => ({
        id: b.id,
        name: b.name,
        finalPrice: b.finalPrice,
        isActive: b.isActive,
        rolesCount: b.roles?.length || 0,
      })),
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Set log level dynamically
   */
  setLogLevel(level: LogLevel) {
    this.logLevel = level;
    console.log(`🔧 Bundle logging level set to: ${LogLevel[level]}`);
  }
}

// Export singleton instance
export const bundleLogger = BundleLogger.getInstance();

// Convenience functions
export const logBundleCommand = (action: string, context: any) => bundleLogger.logCommand(action, context);
export const logBundleError = (operation: string, context: any) => bundleLogger.logError(operation, context);
export const logBundleSuccess = (operation: string, context: any) => bundleLogger.logSuccess(operation, context);
export const logBundleApi = (endpoint: string, context: any) => bundleLogger.logApiCall(endpoint, context);
export const logBundleCheckout = (status: string, context: any) => bundleLogger.logCheckout(status, context);
export const startBundleTimer = (operation: string) => bundleLogger.startTimer(operation);