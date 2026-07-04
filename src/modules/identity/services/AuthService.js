const ConflictError = require("../../../shared/errors/ConflictError");
const EventNames = require("../../../shared/constants/EventNames");
const ExchangeNames = require("../../../shared/constants/ExchangeNames");
const RoutingKeys = require("../../../shared/constants/RoutingKeys");

class AuthService {
  constructor({
    userRepository,
    credentialService,
    tokenService,
    sessionService,
    transactionManager,
    outboxService,
    tokenBlacklistService,
    otpService,
    authenticationProviderFactory,
  }) {
    this.userRepository = userRepository;
    this.credentialService = credentialService;
    this.tokenService = tokenService;
    this.sessionService = sessionService;
    this.transactionManager = transactionManager;
    this.outboxService = outboxService;
    this.tokenBlacklistService = tokenBlacklistService;
    this.otpService = otpService;
    this.authenticationProviderFactory = authenticationProviderFactory;
  }

  async register(data) {
    // Step 1 — check existing user
    const existingUser = await this.userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new ConflictError("Email already exists");
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
          eventName: EventNames.USER_REGISTERED,

          exchange: ExchangeNames.IDENTITY_EXCHANGE,

          routingKey: RoutingKeys.USER_REGISTERED,

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

    const refreshToken = await this.transactionManager.execute(
      async (client) => {
        const token = await this.sessionService.createSession(
          {
            userId: user.id,
            user,
            deviceName: data.deviceName,
          },
          client,
        );

        await this.outboxService.addEvent(
          {
            eventName: EventNames.USER_LOGGED_IN,
            exchange: ExchangeNames.IDENTITY_EXCHANGE,
            routingKey: RoutingKeys.USER_LOGGED_IN,
            payload: { userId: user.id },
          },
          client,
        );

        return token;
      },
    );

    const accessToken = this.tokenService.generateAccessToken(user);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken) {
    await this.sessionService.validateAndGetSession(refreshToken);

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

  async logout(sessionId, accessToken) {
    await this.sessionService.deleteSession(sessionId);

    const decoded = this.tokenService.decode(accessToken);

    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    await this.tokenBlacklistService.blacklist(accessToken, expiresIn);

    await this.outboxService.addEvent({
      eventName: EventNames.USER_LOGGED_OUT,
      exchange: ExchangeNames.IDENTITY_EXCHANGE,
      routingKey: RoutingKeys.USER_LOGGED_OUT,
      payload: { sessionId },
    });

    return {
      success: true,
    };
  }

  async logoutAllDevices(userId) {
    await this.transactionManager.execute(async (client) => {
      await this.userRepository.incrementTokenVersion(userId, client);
      await this.sessionService.deleteAllUserSessions(userId, client);

      await this.outboxService.addEvent(
        {
          eventName: EventNames.USER_LOGGED_OUT_ALL_DEVICES,
          exchange: ExchangeNames.IDENTITY_EXCHANGE,
          routingKey: RoutingKeys.USER_LOGGED_OUT_ALL_DEVICES,
          payload: { userId },
        },
        client,
      );
    });

    return {
      success: true,
    };
  }

  async requestOtp(data) {
    const otp = this.otpService.generateOtp(data.email);

    await this.outboxService.addEvent({
      eventName: EventNames.AUTH_OTP_REQUIRED,
      exchange: ExchangeNames.IDENTITY_EXCHANGE,
      routingKey: RoutingKeys.AUTH_OTP_REQUIRED,
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
