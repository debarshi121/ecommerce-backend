// src/modules/identity/repositories/UserRepository.ts

import type { MaybeTransaction, QueryExecutor } from "../../../shared/types/database";
import type {
  PermissionNameRow,
  SafeUserWithRoleRow,
  UserRow,
  UserWithRoleRow,
} from "../../../shared/types/entities";
import { firstOrFail, firstOrNull } from "../../../shared/utils/rows";
import type { CreateUserInput, IUserRepository } from "../contracts";

export class UserRepository implements IUserRepository {
  private readonly db: QueryExecutor;

  constructor(postgresClient: QueryExecutor) {
    this.db = postgresClient;
  }

  async findByEmail(
    email: string,
    tx: MaybeTransaction = null,
  ): Promise<UserWithRoleRow | null> {
    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u."passwordHash",
        u."roleId",
        u."isActive",
        u."tokenVersion",
        r.name as role
      FROM users u
      LEFT JOIN roles r
        ON u."roleId" = r.id
      WHERE u.email = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<UserWithRoleRow>(query, [email]);

    return firstOrNull(result);
  }

  async findById(
    userId: string,
    tx: MaybeTransaction = null,
  ): Promise<SafeUserWithRoleRow | null> {
    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u."roleId",
        u."isActive",
        u."tokenVersion",
        r.name as role
      FROM users u
      LEFT JOIN roles r
        ON u."roleId" = r.id
      WHERE u.id = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<SafeUserWithRoleRow>(query, [userId]);

    return firstOrNull(result);
  }

  async create(
    user: CreateUserInput,
    tx: MaybeTransaction = null,
  ): Promise<UserRow> {
    const query = `
      INSERT INTO users (
        name,
        email,
        "passwordHash",
        "roleId"
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;

    const values = [user.name, user.email, user.passwordHash, user.roleId];

    const executor = tx ?? this.db;

    const result = await executor.query<UserRow>(query, values);

    return firstOrFail(result, "UserRepository.create");
  }

  async updateLastLogin(
    userId: string,
    tx: MaybeTransaction = null,
  ): Promise<void> {
    const query = `
      UPDATE users
      SET updated_at = NOW()
      WHERE id = $1
    `;

    const executor = tx ?? this.db;

    await executor.query(query, [userId]);
  }

  async findPermissionsById(
    userId: string,
    tx: MaybeTransaction = null,
  ): Promise<PermissionNameRow[]> {
    const query = `
      SELECT p.name
      FROM users u
      JOIN roles r
        ON u."roleId" = r.id
      JOIN role_permissions rp
        ON rp."roleId" = r.id
      JOIN permissions p
        ON p.id = rp."permissionId"
      WHERE u.id = $1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<PermissionNameRow>(query, [userId]);

    return result.rows;
  }

  async incrementTokenVersion(
    userId: string,
    tx: MaybeTransaction = null,
  ): Promise<void> {
    const query = `
      UPDATE users
      SET "tokenVersion" = "tokenVersion" + 1
      WHERE id = $1
    `;

    const executor = tx ?? this.db;

    await executor.query(query, [userId]);
  }
}
