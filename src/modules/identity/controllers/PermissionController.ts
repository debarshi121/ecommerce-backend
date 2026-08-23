// src/modules/identity/controllers/PermissionController.ts

import type { NextFunction, Request, Response } from "express";

import type { PermissionService } from "../services/PermissionService";

interface PermissionNameBody {
  name: string;
}

export class PermissionController {
  private readonly permissionService: PermissionService;

  constructor(permissionService: PermissionService) {
    this.permissionService = permissionService;
  }

  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { name } = req.body as PermissionNameBody;

      const result = await this.permissionService.createPermission(name);

      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      await this.permissionService.deletePermission(req.params.id);

      return res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const result = await this.permissionService.getPermissions();

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
