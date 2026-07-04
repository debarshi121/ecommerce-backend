// src/modules/identity/services/TokenService.js

const jwt = require("jsonwebtoken");
const UnauthorizedError = require("../../../shared/errors/UnauthorizedError");

class TokenService {
  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET;

    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
  }

  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      roleId: user.roleId,
      tokenVersion: user.tokenVersion,
      type: "access",
    };

    return jwt.sign(payload, this.accessSecret, {
      expiresIn: "15m",
      issuer: "ecommerce.com",
    });
  }

  generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      type: "refresh",
    };

    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: "30d",
      issuer: "ecommerce.com",
    });
  }

  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessSecret);
      if (decoded.type !== "access") {
        throw new Error("Invalid token type");
      }
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Token expired");
      }
      throw error;
    }
  }

  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshSecret);
      if (decoded.type !== "refresh") {
        throw new Error("Invalid token type");
      }
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Token expired");
      }
      throw error;
    }
  }

  decode(token) {
    return jwt.decode(token);
  }
}

module.exports = TokenService;
