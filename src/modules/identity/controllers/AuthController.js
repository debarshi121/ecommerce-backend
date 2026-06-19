class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  register = async (req, res) => {
    const result = await this.authService.register(req.body);

    return res.json({
      success: true,
      data: result,
    });
  };
}

module.exports = AuthController;
