class AuthService {
  constructor({
    userRepository,
    sessionRepository,
    credentialService,
    tokenService,
    transactionManager,
    eventPublisher,
  }) {
    this.userRepository = userRepository;

    this.sessionRepository = sessionRepository;

    this.credentialService = credentialService;

    this.tokenService = tokenService;

    this.eventPublisher = eventPublisher;
  }

  async register(data) {
    /*
    data = {
      name,
      email,
      password,
      roleId,
      deviceName
    }
  */

    // Step 1 — check existing user
    const existingUser = await this.userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new Error("Email already exists");
    }

    // Step 2 — hash password
    const passwordHash = await this.credentialService.hashPassword(
      data.password,
    );

    let createdUser = null;
    let refreshToken = null;

    // Step 3 — transactional work
    const result = await this.transactionManager.execute(async (client) => {
      // create user
      createdUser = await this.userRepository.create(
        {
          name: data.name,
          email: data.email,
          passwordHash: passwordHash,
          roleId: data.roleId,
        },
        client,
      );

      // create refresh token
      refreshToken = this.tokenService.generateRefreshToken(createdUser);

      // create session
      await this.sessionRepository.create(
        {
          userId: createdUser.id,
          refreshToken: refreshToken,
          deviceName: data.deviceName,

          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        client,
      );

      return createdUser;
    });

    // Step 4 — generate access token AFTER transaction success
    const accessToken = this.tokenService.generateAccessToken(result);

    // Step 5 — publish event AFTER commit
    // (later this becomes Outbox Pattern)

    try {
      await this.eventPublisher.publish("user.registered", {
        userId: result.id,
        email: result.email,
      });
    } catch (error) {
      console.error("Failed to publish user.registered event", error);

      /*
      DO NOT throw.

      Registration already succeeded.

      Later:
      save to outbox table
    */
    }

    // Step 6 — return response
    return {
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
      },

      accessToken,

      refreshToken,
    };
  }

  async login(data) {
    const user = await this.credentialService.validateCredentials(
      data.email,
      data.password,
    );

    const accessToken = this.tokenService.generateAccessToken(user);

    const refreshToken = this.tokenService.generateRefreshToken(user);

    await this.sessionRepository.create({
      userId: user.id,
      refreshToken,
      deviceName: data.deviceName,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await this.eventPublisher.publish("user.logged_in", {
      userId: user.id,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(oldRefreshToken) {
    const decoded = this.tokenService.verifyRefreshToken(oldRefreshToken);

    const session =
      await this.sessionRepository.findByRefreshToken(oldRefreshToken);

    if (!session) {
      throw new Error("Invalid session");
    }

    const user = await this.userRepository.findById(decoded.userId);

    const accessToken = this.tokenService.generateAccessToken(user);

    const newRefreshToken = this.tokenService.generateRefreshToken(user);

    await this.sessionRepository.updateRefreshToken(
      session.id,
      newRefreshToken,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(sessionId) {
    await this.sessionRepository.deleteById(sessionId);

    return {
      success: true,
    };
  }

  async logoutAllDevices(userId) {
    await this.sessionRepository.deleteByUserId(userId);

    return {
      success: true,
    };
  }
}

module.exports = AuthService;
