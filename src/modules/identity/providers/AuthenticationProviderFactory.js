class AuthenticationProviderFactory {
  constructor({ passwordProvider, otpProvider }) {
    this.passwordProvider = passwordProvider;
    this.otpProvider = otpProvider;
  }

  getProvider(type) {
    switch (type) {
      case "password":
        return this.passwordProvider;

      case "otp":
        return this.otpProvider;

      default:
        throw new Error("Invalid authentication provider");
    }
  }
}

module.exports = AuthenticationProviderFactory;
