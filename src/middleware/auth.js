const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../utils/errors');

/**
 * Verifies the JWT access token sent in the Authorization header.
 * Expected header: "Authorization: Bearer <token>"
 *
 * On success, attaches the decoded payload to req.user so downstream
 * middleware (RBAC) and proxied requests can use it.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Authentication token missing or malformed', 401));
  }

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret);

    if (payload.type && payload.type !== 'access') {
      return next(new AppError('Invalid token type', 401));
    }

    req.user = payload; // e.g. { sub, role, type, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Access token expired', 401));
    }
    return next(new AppError('Invalid access token', 401));
  }
}

/**
 * Same as authenticate() but does not fail the request if no token is
 * present - useful for routes that behave differently for logged-in
 * vs anonymous users. If a token IS present, it must still be valid.
 */
function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header) return next();
  return authenticate(req, res, next);
}

module.exports = { authenticate, optionalAuthenticate };
