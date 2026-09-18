const { z } = require('zod');

// The gateway only validates the shape of requests it forwards - deep
// business validation still happens in the owning service. This catches
// obviously malformed/malicious input before it reaches internal services.

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN', 'FACULTY', 'STUDENT']).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

module.exports = { loginSchema, registerSchema, idParamSchema };
