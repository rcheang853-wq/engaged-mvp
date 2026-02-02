/**
 * User-Friendly Error Messages
 * Maps technical error messages to user-friendly ones
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  type: 'error' | 'warning' | 'info';
}

/**
 * Database error patterns and their user-friendly equivalents
 */
const DATABASE_ERROR_PATTERNS: Record<string, UserFriendlyError> = {
  'duplicate key value violates unique constraint': {
    title: 'Duplicate Entry',
    message: 'This item already exists. Please try a different value.',
    action: 'Check your input and try again',
    type: 'error'
  },
  'foreign key violation': {
    title: 'Related Data Missing',
    message: 'This action requires related data that doesn\'t exist.',
    action: 'Please refresh the page and try again',
    type: 'error'
  },
  'not null violation': {
    title: 'Missing Required Information',
    message: 'Some required fields are missing.',
    action: 'Please fill in all required fields',
    type: 'error'
  },
  'column.*does not exist': {
    title: 'System Error',
    message: 'We encountered a technical issue.',
    action: 'Please try again later or contact support',
    type: 'error'
  },
  'relation.*does not exist': {
    title: 'Data Not Found',
    message: 'The requested information is not available.',
    action: 'Please refresh the page',
    type: 'error'
  },
  'permission denied': {
    title: 'Access Denied',
    message: 'You don\'t have permission to perform this action.',
    action: 'Contact an administrator if you believe this is an error',
    type: 'error'
  }
};

/**
 * Authentication error patterns
 */
const AUTH_ERROR_PATTERNS: Record<string, UserFriendlyError> = {
  'Invalid login credentials': {
    title: 'Login Failed',
    message: 'The email or password you entered is incorrect.',
    action: 'Please check your credentials and try again',
    type: 'error'
  },
  'Email not confirmed': {
    title: 'Email Not Verified',
    message: 'Please verify your email address before logging in.',
    action: 'Check your inbox for the verification link',
    type: 'warning'
  },
  'User already registered': {
    title: 'Account Exists',
    message: 'An account with this email already exists.',
    action: 'Try logging in or use the password reset option',
    type: 'info'
  },
  'Password should be at least': {
    title: 'Password Too Short',
    message: 'Your password must be at least 6 characters long.',
    action: 'Choose a longer password',
    type: 'error'
  },
  'Invalid email': {
    title: 'Invalid Email',
    message: 'Please enter a valid email address.',
    action: 'Check your email format',
    type: 'error'
  },
  'Session not found': {
    title: 'Session Expired',
    message: 'Your session has expired.',
    action: 'Please log in again',
    type: 'warning'
  },
  'refresh_token_not_found': {
    title: 'Session Expired',
    message: 'Your login session has expired.',
    action: 'Please log in again',
    type: 'warning'
  }
};

/**
 * API error patterns
 */
const API_ERROR_PATTERNS: Record<string, UserFriendlyError> = {
  'Network request failed': {
    title: 'Connection Error',
    message: 'Unable to connect to the server.',
    action: 'Check your internet connection and try again',
    type: 'error'
  },
  'Failed to fetch': {
    title: 'Connection Error',
    message: 'Unable to reach the server.',
    action: 'Check your internet connection',
    type: 'error'
  },
  'Timeout': {
    title: 'Request Timed Out',
    message: 'The request took too long to complete.',
    action: 'Please try again',
    type: 'error'
  },
  '401': {
    title: 'Authentication Required',
    message: 'You need to be logged in to perform this action.',
    action: 'Please log in and try again',
    type: 'warning'
  },
  '403': {
    title: 'Access Forbidden',
    message: 'You don\'t have permission to access this resource.',
    action: 'Contact support if you believe this is an error',
    type: 'error'
  },
  '404': {
    title: 'Not Found',
    message: 'The requested resource could not be found.',
    action: 'Check the URL or try searching',
    type: 'error'
  },
  '409': {
    title: 'Conflict',
    message: 'This action conflicts with existing data.',
    action: 'Please review your changes and try again',
    type: 'warning'
  },
  '429': {
    title: 'Too Many Requests',
    message: 'You\'ve made too many requests in a short time.',
    action: 'Please wait a few minutes and try again',
    type: 'warning'
  },
  '500': {
    title: 'Server Error',
    message: 'Something went wrong on our end.',
    action: 'Please try again later',
    type: 'error'
  },
  '503': {
    title: 'Service Unavailable',
    message: 'The service is temporarily unavailable.',
    action: 'Please try again in a few minutes',
    type: 'warning'
  }
};

/**
 * Validation error patterns
 */
const VALIDATION_ERROR_PATTERNS: Record<string, UserFriendlyError> = {
  'required': {
    title: 'Required Field',
    message: 'This field is required.',
    action: 'Please fill in this field',
    type: 'error'
  },
  'invalid email': {
    title: 'Invalid Email',
    message: 'Please enter a valid email address.',
    action: 'Check the email format',
    type: 'error'
  },
  'too short': {
    title: 'Too Short',
    message: 'This value is too short.',
    action: 'Please enter a longer value',
    type: 'error'
  },
  'too long': {
    title: 'Too Long',
    message: 'This value is too long.',
    action: 'Please shorten your input',
    type: 'error'
  },
  'invalid format': {
    title: 'Invalid Format',
    message: 'The format of this field is incorrect.',
    action: 'Please check the required format',
    type: 'error'
  }
};

/**
 * Default fallback error
 */
const DEFAULT_ERROR: UserFriendlyError = {
  title: 'Something Went Wrong',
  message: 'An unexpected error occurred.',
  action: 'Please try again or contact support if the problem persists',
  type: 'error'
};

/**
 * Convert technical error to user-friendly message
 */
export function getUserFriendlyError(error: any): UserFriendlyError {
  // Handle null/undefined
  if (!error) {
    return DEFAULT_ERROR;
  }

  // Extract error message
  const errorMessage = typeof error === 'string'
    ? error
    : error.message || error.error || error.toString();

  const errorString = errorMessage.toLowerCase();

  // Check auth errors first (most specific)
  for (const [pattern, userError] of Object.entries(AUTH_ERROR_PATTERNS)) {
    if (errorString.includes(pattern.toLowerCase())) {
      return userError;
    }
  }

  // Check database errors
  for (const [pattern, userError] of Object.entries(DATABASE_ERROR_PATTERNS)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(errorString)) {
      return userError;
    }
  }

  // Check validation errors
  for (const [pattern, userError] of Object.entries(VALIDATION_ERROR_PATTERNS)) {
    if (errorString.includes(pattern.toLowerCase())) {
      return userError;
    }
  }

  // Check HTTP status codes
  if (error.status || error.statusCode) {
    const statusCode = (error.status || error.statusCode).toString();
    if (API_ERROR_PATTERNS[statusCode]) {
      return API_ERROR_PATTERNS[statusCode];
    }
  }

  // Check API errors
  for (const [pattern, userError] of Object.entries(API_ERROR_PATTERNS)) {
    if (errorString.includes(pattern.toLowerCase())) {
      return userError;
    }
  }

  // Return default error
  return DEFAULT_ERROR;
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: any): {
  title: string;
  message: string;
  action?: string;
  variant: 'error' | 'warning' | 'info';
} {
  const friendlyError = getUserFriendlyError(error);

  return {
    title: friendlyError.title,
    message: friendlyError.message,
    action: friendlyError.action,
    variant: friendlyError.type
  };
}

/**
 * Get concise error message (for toasts/alerts)
 */
export function getErrorMessage(error: any): string {
  const friendlyError = getUserFriendlyError(error);
  return `${friendlyError.title}: ${friendlyError.message}`;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  const errorMessage = typeof error === 'string'
    ? error
    : error.message || error.error || '';

  const networkPatterns = ['network', 'fetch', 'connection', 'timeout', 'offline'];
  return networkPatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern)
  );
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: any): boolean {
  const errorMessage = typeof error === 'string'
    ? error
    : error.message || error.error || '';

  const authPatterns = ['auth', 'login', 'credentials', 'session', 'token', '401', '403'];
  return authPatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern)
  );
}
