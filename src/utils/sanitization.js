/**
 * Sanitization utilities for secure logging and data handling
 * Prevents credential leaks and sensitive data exposure
 */

/**
 * Sanitizes database connection URLs by masking credentials
 * @param {string} url - The database URL to sanitize
 * @returns {string} Sanitized URL with masked credentials
 */
export function sanitizeDatabaseUrl(url) {
  if (!url || typeof url !== 'string') {
    return 'undefined';
  }

  try {
    // Match pattern: protocol://username:password@host:port/database
    // Replace password with asterisks
    return url.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1***$3');
  } catch (error) {
    return '[SANITIZATION_ERROR]';
  }
}

/**
 * Sanitizes error messages that might contain sensitive information
 * @param {Error|string} error - The error to sanitize
 * @returns {string} Sanitized error message
 */
export function sanitizeErrorMessage(error) {
  if (!error) {
    return 'Unknown error';
  }

  const message = error.message || error.toString();
  
  // Sanitize any URLs in the error message
  return message.replace(
    /postgresql:\/\/[^:]+:[^@]+@[^\s]+/gi,
    (match) => sanitizeDatabaseUrl(match)
  );
}

/**
 * Sanitizes API keys by showing only first and last 4 characters
 * @param {string} apiKey - The API key to sanitize
 * @returns {string} Sanitized API key
 */
export function sanitizeApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return 'undefined';
  }

  if (apiKey.length <= 8) {
    return '***';
  }

  const first = apiKey.substring(0, 4);
  const last = apiKey.substring(apiKey.length - 4);
  return `${first}...${last}`;
}

/**
 * Sanitizes Discord tokens by showing only first 8 characters
 * @param {string} token - The Discord token to sanitize
 * @returns {string} Sanitized token
 */
export function sanitizeDiscordToken(token) {
  if (!token || typeof token !== 'string') {
    return 'undefined';
  }

  if (token.length <= 8) {
    return '***';
  }

  return `${token.substring(0, 8)}...`;
}

/**
 * Sanitizes an object by removing or masking sensitive fields
 * @param {Object} obj - The object to sanitize
 * @param {string[]} sensitiveFields - Array of field names to sanitize
 * @returns {Object} Sanitized object
 */
export function sanitizeObject(obj, sensitiveFields = ['password', 'token', 'apiKey', 'secret']) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***';
    }
  }

  return sanitized;
}

/**
 * Creates a safe logger wrapper that automatically sanitizes sensitive data
 * @param {Object} logger - The logger instance to wrap
 * @returns {Object} Wrapped logger with sanitization
 */
export function createSafeLogger(logger) {
  const sanitizeArgs = (args) => {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return sanitizeErrorMessage(arg);
      }
      if (arg instanceof Error) {
        return {
          ...arg,
          message: sanitizeErrorMessage(arg.message),
          stack: arg.stack ? sanitizeErrorMessage(arg.stack) : undefined
        };
      }
      if (typeof arg === 'object' && arg !== null) {
        return sanitizeObject(arg);
      }
      return arg;
    });
  };

  return {
    info: (...args) => logger.info(...sanitizeArgs(args)),
    warn: (...args) => logger.warn(...sanitizeArgs(args)),
    error: (...args) => logger.error(...sanitizeArgs(args)),
    debug: (...args) => logger.debug(...sanitizeArgs(args)),
    log: (...args) => logger.log(...sanitizeArgs(args))
  };
}

/**
 * Sanitizes user input to prevent injection attacks
 * @param {string} input - The user input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove potential code injection attempts
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 2000); // Limit length
}

/**
 * Sanitizes markdown to prevent abuse while keeping basic formatting
 * @param {string} markdown - The markdown text to sanitize
 * @returns {string} Sanitized markdown
 */
export function sanitizeMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Allow basic markdown but prevent abuse
  return markdown
    .replace(/@(everyone|here)/gi, '@\u200b$1') // Prevent mass mentions
    .replace(/<@[!&]?\d+>/g, '') // Remove user/role mentions
    .trim()
    .substring(0, 4000); // Discord embed limit
}

// Made with Bob
