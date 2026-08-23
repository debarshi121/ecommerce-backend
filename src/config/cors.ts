// src/config/cors.ts

import type { CorsOptions } from "cors";

export const corsConfig: CorsOptions = {
  origin: process.env.CORS_ORIGIN?.split(","),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
