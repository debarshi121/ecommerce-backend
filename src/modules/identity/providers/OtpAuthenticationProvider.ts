// src/modules/identity/providers/OtpAuthenticationProvider.ts

import { BadRequestError } from "../../../shared/errors/BadRequestError";
import { NotFoundError } from "../../../shared/errors/NotFoundError";
import type { UserWithRoleRow } from "../../../shared/types/entities";
import type {
  AuthenticationCredentials,
  IOtpService,
  IUserRepository,
} from "../contracts";
import { AuthenticationProvider } from "./AuthenticationProvider";

export class OtpAuthenticationProvider extends AuthenticationProvider {
  private readonly userRepository: IUserRepository;

  private readonly otpService: IOtpService;

  constructor(userRepository: IUserRepository, otpService: IOtpService) {
    super();

    this.userRepository = userRepository;

    this.otpService = otpService;
  }

  override async authenticate(
    credentials: AuthenticationCredentials,
  ): Promise<UserWithRoleRow> {
    const { email, otp } = credentials;

    if (!otp) {
      throw new BadRequestError("otp is required");
    }

    await this.otpService.verifyOtp(email, otp);

    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.isActive) {
      throw new NotFoundError("User not found or inactive");
    }

    return user;
  }
}
