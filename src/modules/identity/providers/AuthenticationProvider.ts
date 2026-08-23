// src/modules/identity/providers/AuthenticationProvider.ts

import { InternalServerError } from "../../../shared/errors/InternalServerError";
import type { UserWithRoleRow } from "../../../shared/types/entities";
import type {
  AuthenticationCredentials,
  IAuthenticationProvider,
} from "../contracts";

/**
 * Base class for credential strategies. Kept abstract so a subclass that
 * forgets `authenticate` fails to compile instead of failing at runtime; the
 * throwing body remains as a guard for callers reaching it dynamically.
 */
export abstract class AuthenticationProvider implements IAuthenticationProvider {
  async authenticate(
    _credentials: AuthenticationCredentials,
  ): Promise<UserWithRoleRow> {
    throw new InternalServerError("authenticate() must be implemented");
  }
}
