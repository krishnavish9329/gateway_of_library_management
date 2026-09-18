const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config');
const requestLogger = require('./middleware/requestLogger');
const { globalLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');
const { AppError } = require('./utils/errors');

const app = express();

// Trust the first proxy hop (e.g. Nginx) so req.ip / rate limiting see
// the real client IP instead of the proxy's.
app.set('trust proxy', 1);

// --- Security headers -------------------------------------------------
app.use(helmet());

// --- CORS allowlist -----------------------------------------------------
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (no Origin header, e.g. curl/health checks)
      if (!origin) return callback(null, true);
      if (config.corsAllowedOrigins.includes(origin)) return callback(null, true);
      return callback(new AppError('Not allowed by CORS', 403));
    },
    credentials: true,
  })
);

// --- Body parsing (size-limited to reduce DoS surface) -----------------
app.use(express.json({ limit: config.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.jsonBodyLimit }));
app.use(cookieParser());

// --- Request ID + structured request logging ----------------------------
app.use(requestLogger);

// --- Global rate limiting (auth routes get a stricter limit, see routes) -
app.use(globalLimiter);

// --- Routes --------------------------------------------------------------
app.use('/', routes);

// --- 404 + centralized error handling -------------------------------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
