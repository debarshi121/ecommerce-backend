// src/types/express.d.ts
//
// Ambient augmentation of the Express request. Everything the middleware
// chain attaches to `req` is declared here once, so controllers can read
// it without casts and a typo is a compile error rather than a 500.

import "express";

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      role: string | null;
    }

    interface Request {
      /** Correlation id assigned by RequestContextMiddleware. */
      requestId?: string;

      /** Set by JwtMiddleware.authenticate once the access token is verified. */
      user?: AuthenticatedUser;

      /**
       * Output of the Zod schema passed to `validate()`: coerced and
       * defaulted `body` / `params` / `query`. Read it through
       * `validated<T>(req)` (shared/validators/validate) so the shape is
       * tied back to the schema that produced it.
       */
      validated?: unknown;
    }
  }
}
