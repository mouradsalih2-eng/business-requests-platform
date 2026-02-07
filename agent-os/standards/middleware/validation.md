# Validation Middleware

Use Zod schema validation with middleware factory:

```js
import { ZodError } from 'zod';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req[source]);
      req[source] = validated;  // Replace with validated data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(e => e.message).join(', ');
        return res.status(400).json({ error: messages });
      }
      next(error);
    }
  };
}

// Convenience wrappers
export const validateBody = (schema) => validate(schema, 'body');
export const validateQuery = (schema) => validate(schema, 'query');
export const validateParams = (schema) => validate(schema, 'params');
```

**Usage:**
```js
router.post('/forgot-password', validateBody(forgotPasswordSchema), handler);
```

**Why Zod:** Type-safe schemas, good error messages, works in client and server.

**Rules:**
- Define schemas in `/validation/schemas.js`
- Use middleware for route-level validation
- Always return 400 with descriptive error message
- Replace `req[source]` with validated/transformed data

