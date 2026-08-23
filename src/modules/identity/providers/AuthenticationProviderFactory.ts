// src/modules/identity/providers/AuthenticationProviderFactory.ts

import { BadRequestError } from "../../../shared/errors/BadRequestError";
import type {
  AuthenticationType,
  IAuthenticationProvider,
  IAuthenticationProviderFactory,
} from "../contracts";

export interface AuthenticationProviderFactoryDependencies {
  passwordProvider: IAuthenticationProvider;
  otpProvider: IAuthenticationProvider;
}

/**
 * Maps a login request type onto its strategy. The union type on
 * `AuthenticationType` is what makes the switch exhaustive: adding a new
 * credential kind to the union without handling it here is a compile error.
 */
export class AuthenticationProviderFactory
  implements IAuthenticationProviderFactory
{
  private readonly passwordProvider: IAuthenticationProvider;

  private readonly otpProvider: IAuthenticationProvider;

  constructor({
    passwordProvider,
    otpProvider,
  }: AuthenticationProviderFactoryDependencies) {
    this.passwordProvider = passwordProvider;
    this.otpProvider = otpProvider;
  }

  getProvider(type: AuthenticationType | undefined): IAuthenticationProvider {
    switch (type) {
      case "password":
        return this.passwordProvider;

      case "otp":
        return this.otpProvider;

      default:
        throw new BadRequestError("Invalid authentication provider");
    }
  }
}
