const winston = require('winston');
const config = require('../config');

// Structured JSON logs in production, readable logs in dev.
const logger = winston.createLogger({
  level: config.isProd ? 'info' : 'debug',
  format: config.isProd
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level}: ${message}${rest}`;
        })
      ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
