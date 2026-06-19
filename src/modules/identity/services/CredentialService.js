// src/modules/identity/services/CredentialService.js

const bcrypt = require("bcrypt");

class CredentialService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async hashPassword(plainPassword) {
    const saltRounds = 10;

    return await bcrypt.hash(plainPassword, saltRounds);
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async validateCredentials(email, password) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValid = await this.verifyPassword(password, user.password_hash);

    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    return user;
  }
}

module.exports = CredentialService;
