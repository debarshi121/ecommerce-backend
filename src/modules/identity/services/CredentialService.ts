// src/modules/identity/services/CredentialService.ts

import bcrypt from "bcrypt";

import { NotFoundError } from "../../../shared/errors/NotFoundError";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import type { UserWithRoleRow } from "../../../shared/types/entities";
import type { ICredentialService, IUserRepository } from "../contracts";

const SALT_ROUNDS = 10;

export class CredentialService implements ICredentialService {
  private readonly userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<UserWithRoleRow> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isValid = await this.verifyPassword(password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    return user;
  }
}
