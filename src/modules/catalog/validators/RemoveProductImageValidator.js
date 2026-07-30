// src/modules/catalog/validators/RemoveProductImageValidator.js

const { z } = require("zod");

const RemoveProductImageValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid product id"),
    imageId: z.uuid("Invalid image id"),
  }),
});

module.exports = RemoveProductImageValidator;
