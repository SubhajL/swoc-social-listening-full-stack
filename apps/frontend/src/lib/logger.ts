import { z } from 'zod';

// Log level schema
const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
type LogLevel = z.infer<typeof LogLevelSchema>;

// Log metadata schema
const LogMetadataSchema = z.object({
  timestamp: z.string(),
  level: LogLevelSchema,
  component: z.string(),
  requestId: z.string().optional(),
  userId: z.string().optional(),
  featureFlags: z.record(z.string(), z.boolean()).optional(),
});

// Log data schema
const LogDataSchema = z.object({
  message: z.string(),
  metadata: LogMetadataSchema,
  error: z.any().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

type LogData = z.infer<typeof LogDataSchema>;

// Generate unique request ID
const generateRequestId = () => {
  return `req_${Math.random().toString(36).substring(2, 15)}`;
};

// Main logger class
class Logger {
  private static instance: Logger;
  private currentRequestId: string = generateRequestId();

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    component: string,
    context?: Record<string, unknown>,
    error?: unknown
  ): LogData {
    return {
      message,
      metadata: {
        timestamp: new Date().toISOString(),
        level,
        component,
        requestId: this.currentRequestId,
      },
      context,
      error,
    };
  }

  private log(data: LogData): void {
    // Validate log data
    const result = LogDataSchema.safeParse(data);
    if (!result.success) {
      console.error('Invalid log data:', result.error);
      return;
    }

    // In development, pretty print the log
    if (import.meta.env.DEV) {
      const { message, metadata, context, error } = data;
      console.group(`[${metadata.level.toUpperCase()}] ${message}`);
      console.log('Metadata:', metadata);
      if (context) console.log('Context:', context);
      if (error) console.log('Error:', error);
      console.groupEnd();
    } else {
      // In production, output structured JSON
      console.log(JSON.stringify(data));
    }
  }

  setRequestId(requestId: string): void {
    this.currentRequestId = requestId;
  }

  debug(message: string, component: string, context?: Record<string, unknown>): void {
    this.log(this.createLogEntry('debug', message, component, context));
  }

  info(message: string, component: string, context?: Record<string, unknown>): void {
    this.log(this.createLogEntry('info', message, component, context));
  }

  warn(message: string, component: string, context?: Record<string, unknown>): void {
    this.log(this.createLogEntry('warn', message, component, context));
  }

  error(message: string, component: string, error?: unknown, context?: Record<string, unknown>): void {
    this.log(this.createLogEntry('error', message, component, context, error));
  }
}

// Export singleton instance
export const logger = Logger.getInstance(); 