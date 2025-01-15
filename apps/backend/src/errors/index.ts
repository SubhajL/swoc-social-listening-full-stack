export class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PostNotFoundError extends BaseError {
  constructor(postId: string) {
    super(
      `Post with ID ${postId} not found`,
      'POST_NOT_FOUND',
      404
    );
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      'DATABASE_ERROR',
      500,
      details
    );
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      details
    );
  }
}

export class LocationResolutionError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      'LOCATION_RESOLUTION_ERROR',
      422,
      details
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