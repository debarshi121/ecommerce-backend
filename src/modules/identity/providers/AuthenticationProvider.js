const InternalServerError = require("../../../shared/errors/InternalServerError");

class AuthenticationProvider {
  async authenticate() {
    throw new InternalServerError("authenticate() must be implemented");
  }
}

module.exports = AuthenticationProvider;
