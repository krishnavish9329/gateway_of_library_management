const { AppError } = require('../utils/errors');

/**
 * Role-based access control.
 * Usage: router.post('/library/books', authenticate, requireRole('ADMIN', 'LIBRARIAN'), ...)
 *
 * Must run AFTER authenticate() so req.user is populated.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
}

module.exports = { requireRole };
