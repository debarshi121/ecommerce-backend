// src/modules/identity/controllers/AuthController.js

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  async register(req, res, next) {
    try {
      const result = await this.authService.register({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        roleId: req.body.roleId,
        deviceName: req.body.deviceName,
      });

      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const result = await this.authService.login({
        email: req.body.email,
        password: req.body.password,
        otp: req.body.otp,
        type: req.body.type,
        deviceName: req.body.deviceName,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
