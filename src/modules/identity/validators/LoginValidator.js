// src/modules/identity/validators/LoginValidator.js

const { z } = require("zod");

const LoginValidator = z.object({
  body: z.object({
    email: z.email(),
    password: z.string().min(6),
    deviceName: z.string().min(1),
  }),
});

module.exports = LoginValidator;
