/**
 * Operational errors we throw on purpose (bad input, auth failure, etc).
 * These are safe to turn into a client-facing message. Anything that is
 * NOT an AppError is treated as an unexpected/internal error and its
 * details are hidden from the client (see errorHandler.js).
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { AppError };
