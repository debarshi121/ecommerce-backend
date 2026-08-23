// src/config/jwt.ts

import type { Secret, SignOptions } from "jsonwebtoken";

export interface JwtConfig {
  accessSecret: Secret;
  refreshSecret: Secret;
  refreshTokenDays: number;
  issuer: string;
  accessTokenExpiresIn: SignOptions["expiresIn"];
  refreshTokenExpiresIn: SignOptions["expiresIn"];
}

/**
 * Both secrets are required — a missing one would otherwise surface as
 * `jwt.sign` throwing per-request instead of the process refusing to boot.
 */
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT env variables missing");
}

export const jwtConfig: JwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 30),
  issuer: process.env.JWT_ISSUER || "ecommerce.com",
  accessTokenExpiresIn: "15m",
  refreshTokenExpiresIn: "30d",
};
