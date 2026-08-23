// src/modules/identity/validators/RefreshTokenValidator.ts

import { z } from "zod";

export const RefreshTokenValidator = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenValidator>;
