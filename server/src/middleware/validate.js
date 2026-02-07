import { ZodError } from 'zod';

/**
 * Validation middleware factory
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Where to get data from ('body', 'query', 'params')
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = req[source];
      const validated = schema.parse(data);
      req[source] = validated; // Replace with validated/transformed data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues || error.errors || [];
        const messages = issues.map((e) => e.message).join(', ');
        return res.status(400).json({ error: messages });
      }
      next(error);
    }
  };
}

/**
 * Validate request body
 */
export function validateBody(schema) {
  return validate(schema, 'body');
}

/**
 * Validate query parameters
 */
export function validateQuery(schema) {
  return validate(schema, 'query');
}

/**
 * Validate route parameters
 */
export function validateParams(schema) {
  return validate(schema, 'params');
}

export default { validate, validateBody, validateQuery, validateParams };
