// src/modules/identity/providers/PasswordAuthenticationProvider.ts

import { BadRequestError } from "../../../shared/errors/BadRequestError";
import type { UserWithRoleRow } from "../../../shared/types/entities";
import type {
  AuthenticationCredentials,
  ICredentialService,
} from "../contracts";
import { AuthenticationProvider } from "./AuthenticationProvider";

export class PasswordAuthenticationProvider extends AuthenticationProvider {
  private readonly credentialService: ICredentialService;

  constructor(credentialService: ICredentialService) {
    super();

    this.credentialService = credentialService;
  }

  override async authenticate(
    credentials: AuthenticationCredentials,
  ): Promise<UserWithRoleRow> {
    if (!credentials.password) {
      throw new BadRequestError("password is required");
    }

    const user = await this.credentialService.validateCredentials(
      credentials.email,
      credentials.password,
    );

    return user;
  }
}
