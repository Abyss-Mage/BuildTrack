import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors = [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  } else if (err.code === 'ER_DUP_ENTRY' || err.message?.includes('UNIQUE constraint failed')) {
    statusCode = 409;
    message = 'Duplicate entry: A record with this unique value already exists.';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired. Please login again.';
  } else {
    message = err.message || message;
  }

  if (statusCode === 500) {
    console.error('[UNHANDLED ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}
