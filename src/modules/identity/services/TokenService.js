// src/modules/identity/services/TokenService.js

const jwt = require("jsonwebtoken");

class TokenService {
  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET;

    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
  }

  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      role: user.role,
    };

    return jwt.sign(payload, this.accessSecret, {
      expiresIn: "15m",
    });
  }

  generateRefreshToken(user) {
    const payload = {
      userId: user.id,
    };

    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: "30d",
    });
  }

  verifyAccessToken(token) {
    return jwt.verify(token, this.accessSecret);
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, this.refreshSecret);
  }

  decode(token) {
    return jwt.decode(token);
  }
}

module.exports = TokenService;
