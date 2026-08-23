// src/modules/identity/services/RoleService.ts

import { ConflictError } from "../../../shared/errors/ConflictError";
import { NotFoundError } from "../../../shared/errors/NotFoundError";
import type {
  RolePermissionRow,
  RoleRow,
} from "../../../shared/types/entities";
import type { IPermissionRepository, IRoleRepository } from "../contracts";

export interface RoleServiceDependencies {
  roleRepository: IRoleRepository;
  permissionRepository: IPermissionRepository;
}

export class RoleService {
  private readonly roleRepository: IRoleRepository;

  private readonly permissionRepository: IPermissionRepository;

  constructor({ roleRepository, permissionRepository }: RoleServiceDependencies) {
    this.roleRepository = roleRepository;

    this.permissionRepository = permissionRepository;
  }

  private async requireRole(roleId: string): Promise<RoleRow> {
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new NotFoundError("Role not found");
    }

    return role;
  }

  async createRole(name: string): Promise<RoleRow> {
    const existing = await this.roleRepository.findByName(name.trim());

    if (existing) {
      throw new ConflictError("Role already exists");
    }

    return this.roleRepository.create({
      name: name.trim(),
    });
  }

  async deleteRole(roleId: string): Promise<void> {
    await this.requireRole(roleId);

    await this.roleRepository.delete(roleId);
  }

  async addPermission(roleId: string, permissionId: string): Promise<void> {
    await this.requireRole(roleId);

    const permission = await this.permissionRepository.findById(permissionId);

    if (!permission) {
      throw new NotFoundError("Permission not found");
    }

    await this.roleRepository.addPermission(roleId, permissionId);
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    await this.roleRepository.removePermission(roleId, permissionId);
  }

  async getPermissions(roleId: string): Promise<RolePermissionRow[]> {
    return this.roleRepository.findPermissions(roleId);
  }
}
