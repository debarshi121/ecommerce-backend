// src/modules/identity/services/AuthService.ts

import { EventNames } from "../../../shared/constants/EventNames";
import { RabbitModules } from "../../../shared/constants/RabbitModules";
import { RoutingKeys } from "../../../shared/constants/RoutingKeys";
import type { IOutboxService } from "../../../shared/contracts";
import { ConflictError } from "../../../shared/errors/ConflictError";
import { NotFoundError } from "../../../shared/errors/NotFoundError";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import type { ITransactionManager } from "../../../shared/types/database";
import type { SafeUserWithRoleRow } from "../../../shared/types/entities";
import type { SuccessResponse } from "../../../shared/types/http";
import type {
  AuthenticationCredentials,
  IAuthenticationProviderFactory,
  ICredentialService,
  IOtpService,
  ISessionService,
  ITokenBlacklistService,
  ITokenService,
  IUserRepository,
  RegisterCommand,
  RegisterResult,
  TokenPair,
  UserRegisteredPayload,
} from "../contracts";

export interface AuthServiceDependencies {
  userRepository: IUserRepository;
  credentialService: ICredentialService;
  tokenService: ITokenService;
  sessionService: ISessionService;
  transactionManager: ITransactionManager;
  outboxService: IOutboxService;
  tokenBlacklistService: ITokenBlacklistService;
  otpService: IOtpService;
  authenticationProviderFactory: IAuthenticationProviderFactory;
}

/**
 * Application service for the authentication use cases. It orchestrates
 * collaborators and transaction boundaries; the rules themselves live in the
 * pieces it composes (credential checks in CredentialService, session
 * lifecycle in SessionService, provider selection in the factory).
 */
export class AuthService {
  private readonly userRepository: IUserRepository;

  private readonly credentialService: ICredentialService;

  private readonly tokenService: ITokenService;

  private readonly sessionService: ISessionService;

  private readonly transactionManager: ITransactionManager;

  private readonly outboxService: IOutboxService;

  private readonly tokenBlacklistService: ITokenBlacklistService;

  private readonly otpService: IOtpService;

  private readonly authenticationProviderFactory: IAuthenticationProviderFactory;

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
  }: AuthServiceDependencies) {
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

  async register(data: RegisterCommand): Promise<RegisterResult> {
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
          deviceName: data.deviceName ?? null,
        },
        client,
      );

      // save event in outbox table
      const payload: UserRegisteredPayload = {
        userId: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
      };

      await this.outboxService.addEvent(
        {
          eventName: EventNames.USER_REGISTERED,

          module: RabbitModules.IDENTITY,

          routingKey: RoutingKeys.USER_REGISTERED,

          payload,
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

  async login(data: AuthenticationCredentials): Promise<TokenPair> {
    const provider = this.authenticationProviderFactory.getProvider(data.type);

    const user = await provider.authenticate(data);

    const refreshToken = await this.transactionManager.execute(
      async (client) => {
        const token = await this.sessionService.createSession(
          {
            userId: user.id,
            user,
            deviceName: data.deviceName ?? null,
          },
          client,
        );

        await this.outboxService.addEvent(
          {
            eventName: EventNames.USER_LOGGED_IN,
            module: RabbitModules.IDENTITY,
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

  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    await this.sessionService.validateAndGetSession(refreshToken);

    const decoded = this.tokenService.verifyRefreshToken(refreshToken);

    const user = await this.userRepository.findById(decoded.userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

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

  async logout(sessionId: string, accessToken: string): Promise<SuccessResponse> {
    await this.sessionService.deleteSession(sessionId);

    const decoded = this.tokenService.decode(accessToken);

    if (!decoded?.exp) {
      throw new UnauthorizedError("Invalid token");
    }

    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    await this.tokenBlacklistService.blacklist(accessToken, expiresIn);

    await this.outboxService.addEvent({
      eventName: EventNames.USER_LOGGED_OUT,
      module: RabbitModules.IDENTITY,
      routingKey: RoutingKeys.USER_LOGGED_OUT,
      payload: { sessionId },
    });

    return {
      success: true,
    };
  }

  async logoutAllDevices(userId: string): Promise<SuccessResponse> {
    await this.transactionManager.execute(async (client) => {
      await this.userRepository.incrementTokenVersion(userId, client);
      await this.sessionService.deleteAllUserSessions(userId, client);

      await this.outboxService.addEvent(
        {
          eventName: EventNames.USER_LOGGED_OUT_ALL_DEVICES,
          module: RabbitModules.IDENTITY,
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

  /**
   * Issues (and delivers, via the OTP event) a one-time password for a
   * passwordless login. Delegated to OtpService so there is a single place
   * that knows how an OTP is generated, stored and announced.
   */
  async requestOtp(data: { email: string }): Promise<SuccessResponse> {
    await this.otpService.requestOtp(data.email);

    return {
      success: true,
    };
  }

  async getCurrentUser(userId: string): Promise<SafeUserWithRoleRow | null> {
    const user = await this.userRepository.findById(userId);
    return user;
  }
}
