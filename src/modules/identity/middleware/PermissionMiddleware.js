// src/modules/identity/middleware/PermissionMiddleware.js

class PermissionMiddleware {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  require(permission) {
    return async (req, res, next) => {
      try {
        const permissions = await this.userRepository.findPermissionsById(
          req.user.id,
        );

        const hasPermission = permissions.some(
          (item) => item.name === permission,
        );

        if (!hasPermission) {
          throw new Error("Forbidden");
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports = PermissionMiddleware;
