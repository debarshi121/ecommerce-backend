// src/modules/identity/controllers/SessionController.js

class SessionController {
  constructor(authService) {
    this.authService = authService;
  }

  async refreshToken(req, res, next) {
    try {
      const result = await this.authService.refreshToken(req.body.refreshToken);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      await this.authService.logout(req.body.sessionId);

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }

  async logoutAllDevices(req, res, next) {
    try {
      await this.authService.logoutAllDevices(req.user.id);

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SessionController;
