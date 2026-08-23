// src/modules/identity/routes/sessionRoutes.ts

import { Router } from "express";

import type { SessionController } from "../controllers/SessionController";
import type { JwtMiddleware } from "../middleware/JwtMiddleware";

export interface SessionRouteDependencies {
  sessionController: SessionController;
  jwtMiddleware: JwtMiddleware;
}

export function sessionRoutes({
  sessionController,
  jwtMiddleware,
}: SessionRouteDependencies): Router {
  const router = Router();

  router.post(
    "/refresh",

    sessionController.refreshToken.bind(sessionController),
  );

  router.post(
    "/logout",

    sessionController.logout.bind(sessionController),
  );

  router.post(
    "/logout-all",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    sessionController.logoutAllDevices.bind(sessionController),
  );

  router.get(
    "/me",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    sessionController.getCurrentUser.bind(sessionController),
  );

  return router;
}
