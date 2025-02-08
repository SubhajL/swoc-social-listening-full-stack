import { z } from 'zod';

// Error codes enum
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_001',
  TIMEOUT = 'NETWORK_002',
  
  // API errors
  INVALID_REQUEST = 'API_001',
  UNAUTHORIZED = 'API_002',
  FORBIDDEN = 'API_003',
  NOT_FOUND = 'API_004',
  VALIDATION_ERROR = 'API_005',
  
  // Telemetry errors
  TELEMETRY_CONNECTION_ERROR = 'TELEMETRY_001',
  TELEMETRY_DATA_INVALID = 'TELEMETRY_002',
  TELEMETRY_TIMEOUT = 'TELEMETRY_003',
  
  // Monitoring errors
  MONITORING_DATA_ERROR = 'MONITORING_001',
  MONITORING_VALIDATION_ERROR = 'MONITORING_002',
  
  // Feature management errors
  FEATURE_NOT_FOUND = 'FEATURE_001',
  FEATURE_DISABLED = 'FEATURE_002',
  
  // Unknown error
  UNKNOWN = 'UNKNOWN_001'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error context schema
export const ErrorContextSchema = z.object({
  code: z.nativeEnum(ErrorCode),
  message: z.string(),
  severity: z.nativeEnum(ErrorSeverity),
  timestamp: z.string(),
  requestId: z.string().optional(),
  userId: z.string().optional(),
  component: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  originalError: z.unknown().optional(),
});

export type ErrorContext = z.infer<typeof ErrorContextSchema>;

// Enhanced error class
export class AppError extends Error {
  readonly context: ErrorContext;

  constructor(context: Omit<ErrorContext, 'timestamp'>) {
    super(context.message);
    this.name = 'AppError';
    this.context = {
      ...context,
      timestamp: new Date().toISOString(),
    };
  }

  static fromError(error: unknown, component: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new AppError({
      code: ErrorCode.UNKNOWN,
      message,
      severity: ErrorSeverity.MEDIUM,
      component,
      details: {
        originalError: error,
      },
    });
  }

  toJSON(): ErrorContext {
    return this.context;
  }
}

// Error factory functions
export const createNetworkError = (
  component: string,
  details?: Record<string, unknown>
): AppError => {
  return new AppError({
    code: ErrorCode.NETWORK_ERROR,
    message: 'Network connection failed',
    severity: ErrorSeverity.HIGH,
    component,
    details,
  });
};

export const createTelemetryError = (
  component: string,
  details?: Record<string, unknown>
): AppError => {
  return new AppError({
    code: ErrorCode.TELEMETRY_CONNECTION_ERROR,
    message: 'Failed to connect to telemetry service',
    severity: ErrorSeverity.HIGH,
    component,
    details,
  });
};

export const createValidationError = (
  component: string,
  details?: Record<string, unknown>
): AppError => {
  return new AppError({
    code: ErrorCode.VALIDATION_ERROR,
    message: 'Data validation failed',
    severity: ErrorSeverity.MEDIUM,
    component,
    details,
  });
}; 