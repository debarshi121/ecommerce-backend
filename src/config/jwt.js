module.exports = {
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 30),
  issuer: process.env.JWT_ISSUER || "ecommerce.com",
  accessTokenExpiresIn: "15m",
  refreshTokenExpiresIn: "30d",
};
