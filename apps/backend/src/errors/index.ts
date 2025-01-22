export class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PostNotFoundError extends BaseError {
  constructor(id: string) {
    super(
      `Post with id ${id} not found`,
      'POST_NOT_FOUND',
      404
    );
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, cause?: any) {
    const pgError = cause as any;
    const code = pgError?.code ? `DB_${pgError.code}` : 'DATABASE_ERROR';
    const details = pgError ? {
      code: pgError.code,
      detail: pgError.detail,
      hint: pgError.hint,
      table: pgError.table,
      column: pgError.column,
      constraint: pgError.constraint
    } : undefined;

    super(message, code, 500, details);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: any) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      details
    );
  }
}

export class LocationResolutionError extends BaseError {
  constructor(message: string, cause?: any) {
    super(
      message,
      'LOCATION_RESOLUTION_ERROR',
      500,
      cause
    );
  }
}

export class DatabasePermissionError extends DatabaseError {
  constructor(table: string, permission: string) {
    super(
      `Permission denied: ${permission} on table ${table}`,
      { code: '42501', table, permission }
    );
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(message: string, cause?: any) {
    super(message, { code: '08006', ...cause });
  }
}

export class DatabaseTableError extends DatabaseError {
  constructor(table: string, operation: string) {
    super(
      `Table error: ${operation} on ${table}`,
      { code: '42P01', table }
    );
  }
}

export class DatabaseColumnError extends DatabaseError {
  constructor(table: string, column: string) {
    super(
      `Column "${column}" does not exist in table "${table}"`,
      { code: '42703', table, column }
    );
  }
}

export class SensorAssignmentError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      'SENSOR_ASSIGNMENT_ERROR',
      422,
      details
    );
  }
} 