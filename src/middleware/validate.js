const { AppError } = require('../utils/errors');

/**
 * Validates req.body / req.params / req.query against zod schemas.
 *
 * Usage:
 *   validate({ body: loginSchema })
 *   validate({ params: idParamSchema, query: listQuerySchema })
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      next();
    } catch (err) {
      const details = err.errors
        ? err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
        : undefined;
      const validationError = new AppError('Invalid request data', 400);
      validationError.details = details;
      next(validationError);
    }
  };
}

module.exports = { validate };
