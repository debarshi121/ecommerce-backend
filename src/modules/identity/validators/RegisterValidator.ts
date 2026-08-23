// src/modules/identity/validators/RegisterValidator.ts

import { z } from "zod";

export const RegisterValidator = z.object({
  body: z.object({
    name: z.string().min(3, "Name too short"),
    email: z.email("Invalid email"),
    password: z.string().min(6, "Password too short"),
    roleId: z.string(),
    deviceName: z.string().min(1),
  }),
});

export type RegisterInput = z.infer<typeof RegisterValidator>;
