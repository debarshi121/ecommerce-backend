// src/modules/catalog/validators/RemoveProductImageValidator.ts

import { z } from "zod";

export const RemoveProductImageValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid product id"),
    imageId: z.uuid("Invalid image id"),
  }),
});

export type RemoveProductImageInput = z.infer<
  typeof RemoveProductImageValidator
>;
