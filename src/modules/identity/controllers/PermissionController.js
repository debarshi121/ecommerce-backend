// src/modules/identity/controllers/PermissionController.js

class PermissionController {
  constructor(permissionService) {
    this.permissionService = permissionService;
  }

  async create(req, res, next) {
    try {
      const result = await this.permissionService.createPermission(
        req.body.name,
      );

      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.permissionService.deletePermission(req.params.id);

      return res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const result = await this.permissionService.getPermissions();

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PermissionController;
