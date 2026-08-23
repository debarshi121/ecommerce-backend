// src/shared/validators/validate.ts

import type { Request, RequestHandler } from "express";
import { ZodError, type ZodType } from "zod";

import { BadRequestError } from "../errors/BadRequestError";
import { InternalServerError } from "../errors/InternalServerError";
import type { ValidationIssue } from "../types/http";

/**
 * The object every request validator is written against: one Zod schema
 * validates `body`, `params` and `query` together.
 */
export interface RequestShape {
  body: unknown;
  params: unknown;
  query: unknown;
}

/**
 * Validates the request against `schema` and stores the *parsed* output on
 * `req.validated`.
 *
 * Storing the output matters: Zod schemas here do real work beyond
 * rejection — `z.coerce.number()` turns `?page=2` into `2` and `.default()`
 * fills in `page`/`limit`/`sortBy` when the client omits them. Reading
 * `req.query` directly would see none of that (and Express 5 makes
 * `req.query` read-only, so it cannot be overwritten in place).
 */
export function validate<S extends ZodType>(schema: S): RequestHandler {
  return (req, _res, next) => {
    try {
      req.validated = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: ValidationIssue[] = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        next(new BadRequestError("Validation failed", errors));

        return;
      }

      next(error);
    }
  };
}

/**
 * Reads back what `validate()` parsed, typed as the schema's output.
 *
 * Call it as `validated<ProductQueryInput>(req)` in a handler that sits
 * behind `validate(ProductQueryValidator)`; the `ProductQueryInput` alias is
 * itself `z.infer<>`-ed from that same schema, so the two cannot drift.
 */
export function validated<T>(req: Request): T {
  if (req.validated === undefined) {
    throw new InternalServerError(
      "Route reads validated input but is not mounted behind validate()",
    );
  }

  return req.validated as T;
}
