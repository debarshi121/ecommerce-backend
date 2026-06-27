// src/modules/identity/middleware/JwtMiddleware.js

class JwtMiddleware {
  constructor({ tokenService, userRepository }) {
    this.tokenService = tokenService;

    this.userRepository = userRepository;
  }

  async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.split(" ")[1];

      const decoded = this.tokenService.verifyAccessToken(token);

      const user = await this.userRepository.findById(decoded.userId);

      if (!user || !user.is_active) {
        throw new Error("Unauthorized");
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
