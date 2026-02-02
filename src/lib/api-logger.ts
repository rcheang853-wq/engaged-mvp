/**
 * API Logging Utilities
 * Provides standardized logging for API routes
 */

import { NextRequest } from 'next/server';

export interface ApiRequestLog {
  url: string;
  method: string;
  headers: {
    authorization: string;
    contentType: string | null;
    userAgent: string | null;
  };
  timestamp: string;
}

export interface ApiErrorLog {
  error: any;
  message: string;
  details?: string;
  hint?: string;
  code?: string;
  stack?: string;
  context?: Record<string, any>;
}

export interface ApiSuccessLog {
  operation: string;
  data?: any;
  timestamp: string;
}

/**
 * Log API request details
 */
export function logApiRequest(request: NextRequest, additionalContext?: Record<string, any>): void {
  const log: ApiRequestLog = {
    url: request.url,
    method: request.method,
    headers: {
      authorization: request.headers.get('authorization') ? 'present' : 'missing',
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent')
    },
    timestamp: new Date().toISOString()
  };

  console.log(`[API Request] ${request.method} ${new URL(request.url).pathname}`, {
    ...log,
    ...additionalContext
  });
}

/**
 * Log authentication failures
 */
export function logAuthFailure(error: any, context?: Record<string, any>): void {
  console.error('[API Auth Failed]', {
    error,
    message: error?.message,
    code: error?.code,
    timestamp: new Date().toISOString(),
    ...context
  });
}

/**
 * Log database errors with full context
 */
export function logDatabaseError(error: any, operation: string, context?: Record<string, any>): void {
  const errorLog: ApiErrorLog = {
    error,
    message: error?.message || 'Unknown database error',
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    stack: error?.stack,
    context: {
      operation,
      timestamp: new Date().toISOString(),
      ...context
    }
  };

  console.error(`[Database Error] ${operation}`, errorLog);
}

/**
 * Log validation errors
 */
export function logValidationError(errors: any[], context?: Record<string, any>): void {
  console.error('[Validation Failed]', {
    errors,
    timestamp: new Date().toISOString(),
    ...context
  });
}

/**
 * Log successful operations
 */
export function logSuccess(operation: string, data?: any, context?: Record<string, any>): void {
  const log: ApiSuccessLog = {
    operation,
    data,
    timestamp: new Date().toISOString()
  };

  console.log(`[API Success] ${operation}`, {
    ...log,
    ...context
  });
}

/**
 * Log general API errors
 */
export function logApiError(error: any, operation: string, context?: Record<string, any>): void {
  const errorLog: ApiErrorLog = {
    error,
    message: error?.message || error?.toString() || 'Unknown error',
    stack: error?.stack,
    context: {
      operation,
      timestamp: new Date().toISOString(),
      ...context
    }
  };

  console.error(`[API Error] ${operation}`, errorLog);
}

/**
 * Sanitize sensitive data from logs
 */
export function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key', 'accessToken', 'refreshToken'];
  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
}
