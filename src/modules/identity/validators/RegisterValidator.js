// src/modules/identity/validators/RegisterValidator.js

const { z } = require("zod");

const RegisterValidator = z.object({
  body: z.object({
    name: z.string().min(3, "Name too short"),
    email: z.email("Invalid email"),
    password: z.string().min(6, "Password too short"),
    roleId: z.string(),
    deviceName: z.string().min(1),
  }),
});

module.exports = RegisterValidator;
