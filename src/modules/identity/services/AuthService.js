class AuthService {
  constructor({
    userRepository,
    credentialService,
    tokenService,
    sessionService,
    transactionManager,
    outboxService,
    authenticationProviderFactory,
  }) {
    this.userRepository = userRepository;
    this.credentialService = credentialService;
    this.tokenService = tokenService;
    this.sessionService = sessionService;
    this.transactionManager = transactionManager;
    this.outboxService = outboxService;
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

      // create session
      const refreshToken = await this.sessionService.createSession(
        {
          userId: createdUser.id,
          user: createdUser,
          deviceName: data.deviceName,
        },
        client,
      );

      // save event in outbox table
      await this.outboxService.addEvent(
        {
          eventName: "user.registered",

          exchange: "identity.exchange",

          routingKey: "user.registered",

          payload: {
            userId: createdUser.id,
            email: createdUser.email,
          },
        },

        client,
      );

      return {
        user: createdUser,
        refreshToken,
      };
    });

    // Step 4 — generate access token AFTER commit
    const accessToken = this.tokenService.generateAccessToken(result.user);

    // Step 5 — return response
    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },

      accessToken,

      refreshToken: result.refreshToken,
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

    await this.outboxService.addEvent({
      eventName: "user.logged_in",
      exchange: "identity.exchange",
      routingKey: "user.logged_in",
      payload: { userId: user.id },
    });

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

  async refreshToken(refreshToken) {
    return this.refreshAccessToken(refreshToken);
  }

  async logout(sessionId) {
    await this.sessionService.deleteSession(sessionId);

    await this.outboxService.addEvent({
      eventName: "user.logged_out",
      exchange: "identity.exchange",
      routingKey: "user.logged_out",
      payload: { sessionId },
    });

    return {
      success: true,
    };
  }

  async logoutAllDevices(userId) {
    await this.sessionService.deleteAllUserSessions(userId);

    await this.outboxService.addEvent({
      eventName: "user.logged_out_all_devices",
      exchange: "identity.exchange",
      routingKey: "user.logged_out_all_devices",
      payload: { userId },
    });

    return {
      success: true,
    };
  }

  async requestOtp(data) {
    const otp = this.otpService.generateOtp(data.email);

    await this.outboxService.addEvent({
      eventName: "auth.otp.required",
      exchange: "identity.exchange",
      routingKey: "auth.otp.required",
      payload: { email: data.email, otp },
    });

    return {
      success: true,
    };
  }

  async getCurrentUser(userId) {
    const user = await this.userRepository.findById(userId);
    return user;
  }
}

module.exports = AuthService;
