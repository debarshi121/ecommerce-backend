class AuthService {
  constructor({
    userRepository,
    credentialService,
    tokenService,
    sessionService,
    transactionManager,
    eventPublisher,
    authenticationProviderFactory,
  }) {
    this.userRepository = userRepository;
    this.credentialService = credentialService;
    this.tokenService = tokenService;
    this.sessionService = sessionService;
    this.transactionManager = transactionManager;
    this.eventPublisher = eventPublisher;
    this.authenticationProviderFactory = authenticationProviderFactory;
  }

  async register(data) {
    // Step 1 — check existing user
    const existingUser = await this.userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new Error("Email already exists");
    }

    // Step 2 — hash password
    const passwordHash = await this.credentialService.hashPassword(
      data.password,
    );

    // Step 3 — transactional work
    const result = await this.transactionManager.execute(async (client) => {
      // create user
      const createdUser = await this.userRepository.create(
        {
          name: data.name,
          email: data.email,
          passwordHash: passwordHash,
          roleId: data.roleId,
        },
        client,
      );

      const refreshToken = await this.sessionService.createSession(
        {
          userId: createdUser.id,
          user: createdUser,
          deviceName: data.deviceName,
        },
        client,
      );

      return {
        user: createdUser,
        refreshToken,
      };
    });

    // Step 4 — generate access token AFTER transaction success
    const accessToken = this.tokenService.generateAccessToken(result.user);

    // Step 5 — publish event AFTER commit
    // (later this becomes Outbox Pattern)

    try {
      await this.eventPublisher.publish("user.registered", {
        userId: result?.user?.id,
        email: result?.user?.email,
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
        id: result?.user?.id,
        name: result?.user?.name,
        email: result?.user?.email,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(data) {
    const provider = this.authenticationProviderFactory.getProvider(data.type);

    const user = await provider.authenticate(data);

    const accessToken = this.tokenService.generateAccessToken(user);

    const refreshToken = await this.sessionService.createSession({
      userId: user.id,
      user,
      deviceName: data.deviceName,
    });

    try {
      await this.eventPublisher.publish("user.logged_in", {
        userId: user.id,
      });
    } catch (error) {
      console.error("Failed to publish user.logged_in event", error);
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken) {
    await this.sessionService.validateSession(refreshToken);

    const decoded = this.tokenService.verifyRefreshToken(refreshToken);

    const user = await this.userRepository.findById(decoded.userId);

    const accessToken = this.tokenService.generateAccessToken(user);

    const newRefreshToken = await this.sessionService.rotateRefreshToken(
      refreshToken,
      user,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(sessionId) {
    await this.sessionService.deleteSession(sessionId);

    try {
      await this.eventPublisher.publish("user.logged_out", {
        sessionId,
      });
    } catch (error) {
      console.error("Failed to publish user.logged_out event", error);
    }

    return {
      success: true,
    };
  }

  async logoutAllDevices(userId) {
    await this.sessionService.deleteAllUserSessions(userId);

    return {
      success: true,
    };
  }

  async requestOtp(data) {
    const otp = this.otpService.generateOtp(data.email);

    try {
      await this.eventPublisher.publish("auth.otp.required", {
        email: data.email,
        otp,
      });
    } catch (error) {
      console.error(error);
      throw error;
    }

    return {
      success: true,
    };
  }
}

module.exports = AuthService;
