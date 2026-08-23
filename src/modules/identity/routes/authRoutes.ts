// src/modules/identity/routes/authRoutes.ts

import { Router } from "express";

import { validate } from "../../../shared/validators/validate";
import type { AuthController } from "../controllers/AuthController";
import { LoginValidator } from "../validators/LoginValidator";
import { RegisterValidator } from "../validators/RegisterValidator";

export interface AuthRouteDependencies {
  authController: AuthController;
}

export function authRoutes({ authController }: AuthRouteDependencies): Router {
  const router = Router();

  router.post(
    "/register",

    validate(RegisterValidator),

    authController.register.bind(authController),
  );

  router.post(
    "/login",

    validate(LoginValidator),

    authController.login.bind(authController),
  );

  return router;
}
