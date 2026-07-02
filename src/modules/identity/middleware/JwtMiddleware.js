// src/modules/identity/middleware/JwtMiddleware.js

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
        throw new Error("Unauthorized");
      }

      const token = authHeader.split(" ")[1];

      const blacklisted = await this.tokenBlacklistService.isBlacklisted(token);

      if (blacklisted) {
        throw new Error("Unauthorized: Invalid or expired token");
      }

      const decoded = this.tokenService.verifyAccessToken(token);

      const user = await this.userRepository.findById(decoded.userId);

      if (!user || !user.isActive) {
        throw new Error("Unauthorized");
      }

      if (user.tokenVersion !== decoded.tokenVersion) {
        throw new Error("Unauthorized: Token version mismatch");
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
