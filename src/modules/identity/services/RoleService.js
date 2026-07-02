// src/modules/identity/services/RoleService.js

class RoleService {
  constructor({ roleRepository, permissionRepository }) {
    this.roleRepository = roleRepository;

    this.permissionRepository = permissionRepository;
  }

  async createRole(name) {
    const existing = await this.roleRepository.findByName(name.trim());

    if (existing) {
      throw new Error("Role already exists");
    }

    return this.roleRepository.create({
      name: name.trim(),
    });
  }

  async deleteRole(roleId) {
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new Error("Role not found");
    }

    await this.roleRepository.delete(roleId);
  }

  async addPermission(roleId, permissionId) {
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new Error("Role not found");
    }

    const permission = await this.permissionRepository.findById(permissionId);

    if (!permission) {
      throw new Error("Permission not found");
    }

    await this.roleRepository.addPermission(roleId, permissionId);
  }

  async removePermission(roleId, permissionId) {
    await this.roleRepository.removePermission(roleId, permissionId);
  }

  async getPermissions(roleId) {
    return this.roleRepository.findPermissions(roleId);
  }
}

module.exports = RoleService;
