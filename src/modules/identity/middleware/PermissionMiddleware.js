// src/modules/identity/middleware/PermissionMiddleware.js

const ForbiddenError = require("../../../shared/errors/ForbiddenError");

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
          throw new ForbiddenError(`Missing permission: ${permission}`);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports = PermissionMiddleware;
