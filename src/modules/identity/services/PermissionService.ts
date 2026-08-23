// src/modules/identity/services/PermissionService.ts

import { ConflictError } from "../../../shared/errors/ConflictError";
import { NotFoundError } from "../../../shared/errors/NotFoundError";
import type { PermissionRow } from "../../../shared/types/entities";
import type { IPermissionRepository } from "../contracts";

export class PermissionService {
  private readonly permissionRepository: IPermissionRepository;

  constructor(permissionRepository: IPermissionRepository) {
    this.permissionRepository = permissionRepository;
  }

  async createPermission(name: string): Promise<PermissionRow> {
    const existing = await this.permissionRepository.findByName(name.trim());

    if (existing) {
      throw new ConflictError("Permission already exists");
    }

    return this.permissionRepository.create({
      name: name.trim(),
    });
  }

  async deletePermission(permissionId: string): Promise<void> {
    const permission = await this.permissionRepository.findById(permissionId);

    if (!permission) {
      throw new NotFoundError("Permission not found");
    }

    await this.permissionRepository.delete(permissionId);
  }

  async getPermissions(): Promise<PermissionRow[]> {
    return this.permissionRepository.findAll();
  }
}
