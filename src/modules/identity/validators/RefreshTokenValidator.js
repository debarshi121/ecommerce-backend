// src/modules/identity/validators/RefreshTokenValidator.js

const { z } = require("zod");

const RefreshTokenValidator = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

module.exports = RefreshTokenValidator;
