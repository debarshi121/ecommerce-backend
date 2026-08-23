// src/modules/identity/routes/otpRoutes.ts

import { Router } from "express";

import type { OtpController } from "../controllers/OtpController";

export interface OtpRouteDependencies {
  otpController: OtpController;
}

export function otpRoutes({ otpController }: OtpRouteDependencies): Router {
  const router = Router();

  router.post(
    "/request",

    otpController.requestOtp.bind(otpController),
  );

  return router;
}
