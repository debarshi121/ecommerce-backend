// src/modules/inventory/validators/ReservationsQueryValidator.ts

import { z } from "zod";

import { ReservationStatus } from "../constants/ReservationStatus";

export const ReservationsQueryValidator = z.object({
  params: z.object({
    productId: z.uuid("Invalid product id"),
  }),

  query: z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    status: z.enum(ReservationStatus).optional(),
  }),
});

export type ReservationsQueryInput = z.infer<
  typeof ReservationsQueryValidator
>;
