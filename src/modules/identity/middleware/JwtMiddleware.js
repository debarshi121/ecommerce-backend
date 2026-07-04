// src/modules/identity/middleware/JwtMiddleware.js
const UnauthorizedError = require("../../../shared/errors/UnauthorizedError");
const NotFoundError = require("../../../shared/errors/NotFoundError");

class JwtMiddleware {
  constructor({ tokenService, userRepository, tokenBlacklistService }) {
    this.tokenService = tokenService;
    this.userRepository = userRepository;
    this.tokenBlacklistService = tokenBlacklistService;
  }

  async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError("Unauthorized");
      }

      const token = authHeader.split(" ")[1];

      const blacklisted = await this.tokenBlacklistService.isBlacklisted(token);

      if (blacklisted) {
        throw new UnauthorizedError("Unauthorized");
      }

      const decoded = this.tokenService.verifyAccessToken(token);

      const user = await this.userRepository.findById(decoded.userId);

      if (!user || !user.isActive) {
        throw new NotFoundError("User not found");
      }

      if (user.tokenVersion !== decoded.tokenVersion) {
        throw new UnauthorizedError("Unauthorized");
      }

      req.user = {
        id: user.id,
        role: user.role,
      };

      next();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = JwtMiddleware;
