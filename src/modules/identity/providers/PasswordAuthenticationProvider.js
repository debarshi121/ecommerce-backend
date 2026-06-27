const AuthenticationProvider = require("./AuthenticationProvider");

class PasswordAuthenticationProvider extends AuthenticationProvider {
  constructor(credentialService) {
    super();

    this.credentialService = credentialService;
  }

  async authenticate(credentials) {
    const user = await this.credentialService.validateCredentials(
      credentials.email,
      credentials.password,
    );

    return user;
  }
}

module.exports = PasswordAuthenticationProvider;
