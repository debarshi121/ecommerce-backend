// src/shared/types/http.ts

import type { Router } from "express";

/**
 * A mountable route group. Each module's `routes/index.ts` returns a list of
 * these, and `registerRoutes` mounts every one under `/api/v1`, so adding a
 * module never means touching the app wiring.
 */
export interface RouteDefinition {
  path: string;
  router: Router;
}

/** Field-level detail attached to a 400 response. */
export interface ValidationIssue {
  field: string;
  message: string;
}

/** The `{ success: true }` acknowledgement several endpoints return. */
export interface SuccessResponse {
  success: true;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: ValidationIssue[];
}
