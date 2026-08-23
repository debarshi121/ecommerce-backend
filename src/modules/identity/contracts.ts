// src/modules/identity/contracts.ts
//
// The identity module's ports and command/result shapes. Services and
// middleware depend on these interfaces, never on a concrete repository or
// provider class.

import type { JwtPayload } from "jsonwebtoken";

import type { MaybeTransaction, Transaction } from "../../shared/types/database";
import type {
  PermissionNameRow,
  PermissionRow,
  RolePermissionRow,
  RoleRow,
  SafeUserWithRoleRow,
  SessionRow,
  UserRow,
  UserWithRoleRow,
} from "../../shared/types/entities";

/*
|--------------------------------------------------------------------------
| Tokens
|--------------------------------------------------------------------------
*/

/** Claims carried by an access token. */
export interface AccessTokenClaims extends JwtPayload {
  userId: string;
  roleId: string | null;
  tokenVersion: number;
  type: "access";
}

/** Claims carried by a refresh token — deliberately minimal. */
export interface RefreshTokenClaims extends JwtPayload {
  userId: string;
  type: "refresh";
}

/** The user fields token generation needs; any user projection satisfies it. */
export interface TokenSubject {
  id: string;
  roleId: string | null;
  tokenVersion: number;
}

export interface ITokenService {
  generateAccessToken(user: TokenSubject): string;
  generateRefreshToken(user: Pick<TokenSubject, "id">): string;
  verifyAccessToken(token: string): AccessTokenClaims;
  verifyRefreshToken(token: string): RefreshTokenClaims;
  hashRefreshToken(refreshToken: string): string;
  decode(token: string): JwtPayload | null;
}

export interface ITokenBlacklistService {
  blacklist(token: string, ttlSeconds: number): Promise<void>;
  isBlacklisted(token: string): Promise<boolean>;
}

/*
|--------------------------------------------------------------------------
| Repositories
|--------------------------------------------------------------------------
*/

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  roleId: string | null;
}

export interface IUserRepository {
  findByEmail(
    email: string,
    tx?: MaybeTransaction,
  ): Promise<UserWithRoleRow | null>;
  findById(
    userId: string,
    tx?: MaybeTransaction,
  ): Promise<SafeUserWithRoleRow | null>;
  create(user: CreateUserInput, tx?: MaybeTransaction): Promise<UserRow>;
  updateLastLogin(userId: string, tx?: MaybeTransaction): Promise<void>;
  findPermissionsById(
    userId: string,
    tx?: MaybeTransaction,
  ): Promise<PermissionNameRow[]>;
  incrementTokenVersion(userId: string, tx?: MaybeTransaction): Promise<void>;
}

export interface CreateSessionRow {
  userId: string;
  refreshTokenHash: string;
  deviceName: string | null;
  expiresAt: Date;
}

export interface ISessionRepository {
  create(session: CreateSessionRow, tx?: MaybeTransaction): Promise<SessionRow>;
  findByRefreshTokenHash(
    refreshTokenHash: string,
    tx?: MaybeTransaction,
  ): Promise<SessionRow | null>;
  findByUserId(userId: string, tx?: MaybeTransaction): Promise<SessionRow[]>;
  deleteById(sessionId: string, tx?: MaybeTransaction): Promise<void>;
  deleteByUserId(userId: string, tx?: MaybeTransaction): Promise<void>;
  updateRefreshTokenHash(
    sessionId: string,
    newRefreshTokenHash: string,
    tx?: MaybeTransaction,
  ): Promise<SessionRow>;
  deleteExpired(tx?: MaybeTransaction): Promise<void>;
}

export interface IRoleRepository {
  create(role: { name: string }, tx?: MaybeTransaction): Promise<RoleRow>;
  findById(roleId: string, tx?: MaybeTransaction): Promise<RoleRow | null>;
  findByName(name: string, tx?: MaybeTransaction): Promise<RoleRow | null>;
  delete(roleId: string, tx?: MaybeTransaction): Promise<void>;
  addPermission(
    roleId: string,
    permissionId: string,
    tx?: MaybeTransaction,
  ): Promise<void>;
  removePermission(
    roleId: string,
    permissionId: string,
    tx?: MaybeTransaction,
  ): Promise<void>;
  findPermissions(
    roleId: string,
    tx?: MaybeTransaction,
  ): Promise<RolePermissionRow[]>;
}

export interface IPermissionRepository {
  create(
    permission: { name: string },
    tx?: MaybeTransaction,
  ): Promise<PermissionRow>;
  findById(
    permissionId: string,
    tx?: MaybeTransaction,
  ): Promise<PermissionRow | null>;
  findByName(
    name: string,
    tx?: MaybeTransaction,
  ): Promise<PermissionRow | null>;
  findAll(tx?: MaybeTransaction): Promise<PermissionRow[]>;
  delete(permissionId: string, tx?: MaybeTransaction): Promise<void>;
}

/*
|--------------------------------------------------------------------------
| Credentials, OTP and authentication providers
|--------------------------------------------------------------------------
*/

export interface ICredentialService {
  hashPassword(plainPassword: string): Promise<string>;
  verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
  validateCredentials(
    email: string,
    password: string,
  ): Promise<UserWithRoleRow>;
}

export interface IOtpStore {
  save(email: string, otp: string, ttlSeconds?: number): Promise<void>;
  get(email: string): Promise<string | null>;
  delete(email: string): Promise<void>;
}

export interface IOtpService {
  requestOtp(email: string): Promise<boolean>;
  verifyOtp(email: string, otp: string): Promise<boolean>;
}

/** How a login request proves who it is. */
export type AuthenticationType = "password" | "otp";

export interface AuthenticationCredentials {
  email: string;
  password?: string;
  otp?: string;
  type?: AuthenticationType;
  deviceName?: string | null;
}

/**
 * Strategy interface: one implementation per credential type, selected at
 * runtime by `AuthenticationProviderFactory`. Adding a new login method
 * (magic link, SSO) means adding an implementation, not editing AuthService.
 */
export interface IAuthenticationProvider {
  authenticate(
    credentials: AuthenticationCredentials,
  ): Promise<UserWithRoleRow>;
}

export interface IAuthenticationProviderFactory {
  getProvider(type: AuthenticationType | undefined): IAuthenticationProvider;
}

/*
|--------------------------------------------------------------------------
| Sessions
|--------------------------------------------------------------------------
*/

export interface CreateSessionCommand {
  userId: string;
  user: TokenSubject;
  deviceName?: string | null;
}

export interface ISessionService {
  /** Returns the plaintext refresh token; only its hash is persisted. */
  createSession(
    command: CreateSessionCommand,
    tx?: MaybeTransaction,
  ): Promise<string>;
  rotateRefreshToken(
    oldRefreshToken: string,
    user: Pick<TokenSubject, "id">,
  ): Promise<string>;
  deleteSession(sessionId: string): Promise<void>;
  deleteAllUserSessions(userId: string, tx?: MaybeTransaction): Promise<void>;
  validateAndGetSession(refreshToken: string): Promise<SessionRow>;
  cleanupExpiredSessions(): Promise<void>;
}

/*
|--------------------------------------------------------------------------
| Auth use-case results
|--------------------------------------------------------------------------
*/

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface RegisterCommand {
  name: string;
  email: string;
  password: string;
  roleId: string | null;
  deviceName?: string | null;
}

export interface RegisterResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Payload of the UserRegistered integration event. */
export interface UserRegisteredPayload {
  userId: string;
  name: string;
  email: string;
}

export interface OtpRequiredPayload {
  email: string;
  otp: string;
}

/*
|--------------------------------------------------------------------------
| Inbound transaction handles
|--------------------------------------------------------------------------
*/

export type { Transaction };
