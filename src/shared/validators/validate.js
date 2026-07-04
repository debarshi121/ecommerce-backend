// src/shared/validators/validate.js

const { ZodError } = require("zod");

const BadRequestError = require("../errors/BadRequestError");

function validate(schema) {
  return (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        return next(new BadRequestError("Validation failed", errors));
      }

      next(error);
    }
  };
}

module.exports = validate;
