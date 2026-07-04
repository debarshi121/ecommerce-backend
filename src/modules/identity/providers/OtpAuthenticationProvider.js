const AuthenticationProvider = require("./AuthenticationProvider");
const NotFoundError = require("../../../shared/errors/NotFoundError");

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

    if (!user || !user.isActive) {
      throw new NotFoundError("User not found or inactive");
    }

    return user;
  }
}

module.exports = OtpAuthenticationProvider;
