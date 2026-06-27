class AuthenticationProvider {
  async authenticate() {
    throw new Error("authenticate() must be implemented");
  }
}

module.exports = AuthenticationProvider;
