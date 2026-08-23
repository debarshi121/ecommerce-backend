// src/modules/inventory/validators/ReservationsQueryValidator.js

const { z } = require("zod");

const ReservationStatus = require("../constants/ReservationStatus");

const ReservationsQueryValidator = z.object({
  params: z.object({
    productId: z.uuid("Invalid product id"),
  }),

  query: z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    status: z
      .enum([
        ReservationStatus.PENDING,
        ReservationStatus.RESERVED,
        ReservationStatus.RELEASED,
        ReservationStatus.CONFIRMED,
        ReservationStatus.EXPIRED,
        ReservationStatus.FAILED,
      ])
      .optional(),
  }),
});

module.exports = ReservationsQueryValidator;
