const express = require('express');
const config = require('../config');

const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../middleware/schemas');
const { authLimiter } = require('../middleware/rateLimiter');
const { createServiceProxy } = require('../proxy/proxy');

const router = express.Router();

// ---- Proxies to internal services -----------------------------------
const userServiceProxy = createServiceProxy({ target: config.services.user });
const notificationServiceProxy = createServiceProxy({ target: config.services.notification });
const monolithServiceProxy = createServiceProxy({ target: config.services.monolith });

// ---- Health check (public, used by load balancers/orchestrators) ----
router.get('/health', (req, res) => {
  res.json({ success: true, service: 'api-gateway', status: 'ok' });
});

// ---- Auth routes (public, but rate-limited + validated) -------------
// These are forwarded to the User Service, which owns credentials/tokens.
router.post('/api/auth/login', authLimiter, validate({ body: loginSchema }), userServiceProxy);
router.post(
  '/api/auth/register',
  authLimiter,
  validate({ body: registerSchema }),
  userServiceProxy
);
router.post(
  '/api/auth/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  userServiceProxy
);
router.post(
  '/api/auth/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  userServiceProxy
);
router.post('/api/auth/refresh', authLimiter, userServiceProxy);
router.post('/api/auth/logout', authenticate, userServiceProxy);

// ---- User management (protected) -------------------------------------
router.use('/api/users', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), userServiceProxy);

// ---- Notifications (protected) ---------------------------------------
router.use('/api/notifications', authenticate, notificationServiceProxy);

// ---- Library module -> Monolith (protected, RBAC per doc's matrix) ---
router.get(
  '/api/library/books',
  authenticate,
  requireRole('SUPER_ADMIN', 'ADMIN', 'LIBRARIAN', 'FACULTY', 'STUDENT'),
  monolithServiceProxy
);
router.use(
  '/api/library',
  authenticate,
  requireRole('SUPER_ADMIN', 'ADMIN', 'LIBRARIAN'),
  monolithServiceProxy
);

// ---- Faculty module -> Monolith (protected) ---------------------------
router.use('/api/faculty', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), monolithServiceProxy);

module.exports = router;
