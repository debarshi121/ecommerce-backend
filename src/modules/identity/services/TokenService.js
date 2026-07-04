// src/modules/identity/services/TokenService.js

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const UnauthorizedError = require("../../../shared/errors/UnauthorizedError");
const jwtConfig = require("../../../config/jwt");

class TokenService {
  constructor() {
    this.accessSecret = jwtConfig.accessSecret;
    this.refreshSecret = jwtConfig.refreshSecret;
  }

  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      roleId: user.roleId,
      tokenVersion: user.tokenVersion,
      type: "access",
    };

    return jwt.sign(payload, this.accessSecret, {
      expiresIn: jwtConfig.accessTokenExpiresIn,
      issuer: jwtConfig.issuer,
    });
  }

  generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      type: "refresh",
    };

    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: jwtConfig.refreshTokenExpiresIn,
      issuer: jwtConfig.issuer,
    });
  }

  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessSecret, {
        issuer: jwtConfig.issuer,
      });
      if (decoded.type !== "access") {
        throw new UnauthorizedError("Invalid token type");
      }
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Token expired");
      }

      if (
        error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.NotBeforeError
      ) {
        throw new UnauthorizedError("Invalid token");
      }

      throw error;
    }
  }

  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        issuer: jwtConfig.issuer,
      });
      if (decoded.type !== "refresh") {
        throw new UnauthorizedError("Invalid token type");
      }
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Token expired");
      }

      if (
        error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.NotBeforeError
      ) {
        throw new UnauthorizedError("Invalid token");
      }

      throw error;
    }
  }

  hashRefreshToken(refreshToken) {
    return crypto.createHash("sha256").update(refreshToken).digest("hex");
  }

  decode(token) {
    return jwt.decode(token);
  }
}

module.exports = TokenService;
