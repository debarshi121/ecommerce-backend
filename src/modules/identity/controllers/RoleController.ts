// src/modules/identity/controllers/RoleController.ts

import type { NextFunction, Request, Response } from "express";

import type { RoleService } from "../services/RoleService";

interface RoleNameBody {
  name: string;
}

interface PermissionIdBody {
  permissionId: string;
}

export class RoleController {
  private readonly roleService: RoleService;

  constructor(roleService: RoleService) {
    this.roleService = roleService;
  }

  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { name } = req.body as RoleNameBody;

      const result = await this.roleService.createRole(name);

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
      await this.roleService.deleteRole(req.params.id);

      return res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }

  async addPermission(
    req: Request<{ roleId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { permissionId } = req.body as PermissionIdBody;

      await this.roleService.addPermission(req.params.roleId, permissionId);

      return res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }

  async removePermission(
    req: Request<{ roleId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { permissionId } = req.body as PermissionIdBody;

      await this.roleService.removePermission(req.params.roleId, permissionId);

      return res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPermissions(
    req: Request<{ roleId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const result = await this.roleService.getPermissions(req.params.roleId);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
