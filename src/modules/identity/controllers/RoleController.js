// src/modules/identity/controllers/RoleController.js

class RoleController {
  constructor(roleService) {
    this.roleService = roleService;
  }

  async create(req, res, next) {
    try {
      const result = await this.roleService.createRole(req.body.name);

      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.roleService.deleteRole(req.params.id);

      return res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }

  async addPermission(req, res, next) {
    try {
      await this.roleService.addPermission(
        req.params.roleId,
        req.body.permissionId,
      );

      return res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }

  async removePermission(req, res, next) {
    try {
      await this.roleService.removePermission(
        req.params.roleId,
        req.body.permissionId,
      );

      return res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPermissions(req, res, next) {
    try {
      const result = await this.roleService.getPermissions(req.params.roleId);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RoleController;
