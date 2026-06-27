const AuthenticationProvider = require("./AuthenticationProvider");

class OtpAuthenticationProvider extends AuthenticationProvider {
  constructor(userRepository, otpService) {
    super();

    this.userRepository = userRepository;

    this.otpService = otpService;
  }

  async authenticate(credentials) {
    const { email, otp } = credentials;

    await this.otpService.verifyOtp(email, otp);

    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.is_active) {
      throw new Error("Authentication failed");
    }

    return user;
  }
}

module.exports = OtpAuthenticationProvider;
