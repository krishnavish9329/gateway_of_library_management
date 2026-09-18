const logger = require('../utils/logger');
const config = require('../config');

function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

/**
 * Single place that turns any thrown/next(err) error into a response.
 * Operational errors (AppError) send their message + statusCode to the
 * client. Anything else is logged in full server-side but the client
 * only ever sees a generic "Internal server error" - no stack traces,
 * no DB connection strings, no internal hostnames.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isOperational = err.isOperational === true;
  const statusCode = isOperational ? err.statusCode || 500 : 500;

  logger.error('request_error', {
    requestId: req.requestId,
    method: req.method,
    endpoint: req.originalUrl,
    statusCode,
    message: err.message,
    stack: config.isProd ? undefined : err.stack,
  });

  const body = {
    success: false,
    message: isOperational ? err.message : 'Internal server error',
  };

  if (isOperational && err.details) {
    body.errors = err.details;
  }

  res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
