const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Attaches a unique request ID (useful for tracing a request across
 * the gateway and downstream services) and logs method/endpoint/status/duration.
 */
function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

    logger.info('request', {
      requestId,
      service: 'api-gateway',
      method: req.method,
      endpoint: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userId: req.user?.sub || null,
      ip: req.ip,
    });
  });

  next();
}

module.exports = requestLogger;
