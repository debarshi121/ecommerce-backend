// src/modules/identity/services/PermissionService.js

class PermissionService {
  constructor(permissionRepository) {
    this.permissionRepository = permissionRepository;
  }

  async createPermission(name) {
    const existing = await this.permissionRepository.findByName(name.trim());

    if (existing) {
      throw new Error("Permission already exists");
    }

    return this.permissionRepository.create({
      name: name.trim(),
    });
  }

  async deletePermission(permissionId) {
    const permission = await this.permissionRepository.findById(permissionId);

    if (!permission) {
      throw new Error("Permission not found");
    }

    await this.permissionRepository.delete(permissionId);
  }

  async getPermissions() {
    return this.permissionRepository.findAll();
  }
}

module.exports = PermissionService;
