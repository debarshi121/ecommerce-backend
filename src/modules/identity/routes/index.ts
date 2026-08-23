// src/modules/identity/routes/index.ts

import type { RouteDefinition } from "../../../shared/types/http";
import type { AuthRouteDependencies } from "./authRoutes";
import { authRoutes } from "./authRoutes";
import type { OtpRouteDependencies } from "./otpRoutes";
import { otpRoutes } from "./otpRoutes";
import type { PermissionRouteDependencies } from "./permissionRoutes";
import { permissionRoutes } from "./permissionRoutes";
import type { RoleRouteDependencies } from "./roleRoutes";
import { roleRoutes } from "./roleRoutes";
import type { SessionRouteDependencies } from "./sessionRoutes";
import { sessionRoutes } from "./sessionRoutes";

/**
 * Everything the identity module needs from the container — the union of its
 * route groups' requirements, so the container can only be under-supplied at
 * compile time, never at request time.
 */
export type IdentityRouteDependencies = AuthRouteDependencies &
  OtpRouteDependencies &
  SessionRouteDependencies &
  RoleRouteDependencies &
  PermissionRouteDependencies;

export function identityRoutes({
  authController,
  otpController,
  sessionController,
  roleController,
  permissionController,
  jwtMiddleware,
  permissionMiddleware,
}: IdentityRouteDependencies): RouteDefinition[] {
  return [
    {
      path: "/auth",

      router: authRoutes({
        authController,
      }),
    },

    {
      path: "/otp",

      router: otpRoutes({
        otpController,
      }),
    },

    {
      path: "/session",

      router: sessionRoutes({
        sessionController,
        jwtMiddleware,
      }),
    },

    {
      path: "/role",

      router: roleRoutes({
        roleController,
        jwtMiddleware,
        permissionMiddleware,
      }),
    },

    {
      path: "/permission",

      router: permissionRoutes({
        permissionController,
        jwtMiddleware,
        permissionMiddleware,
      }),
    },
  ];
}
