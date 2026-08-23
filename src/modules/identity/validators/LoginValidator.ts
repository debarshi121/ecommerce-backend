// src/modules/identity/validators/LoginValidator.ts

import { z } from "zod";

export const LoginValidator = z.object({
  body: z.object({
    email: z.email(),
    password: z.string().min(6),
    deviceName: z.string().min(1),
  }),
});

export type LoginInput = z.infer<typeof LoginValidator>;
