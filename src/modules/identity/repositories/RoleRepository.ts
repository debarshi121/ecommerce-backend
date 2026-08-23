// src/modules/identity/repositories/RoleRepository.ts

import type { MaybeTransaction, QueryExecutor } from "../../../shared/types/database";
import type { RolePermissionRow, RoleRow } from "../../../shared/types/entities";
import { firstOrFail, firstOrNull } from "../../../shared/utils/rows";
import type { IRoleRepository } from "../contracts";

export class RoleRepository implements IRoleRepository {
  private readonly db: QueryExecutor;

  constructor(postgresClient: QueryExecutor) {
    this.db = postgresClient;
  }

  async create(
    role: { name: string },
    tx: MaybeTransaction = null,
  ): Promise<RoleRow> {
    const query = `
      INSERT INTO roles (
        name
      )
      VALUES ($1)
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<RoleRow>(query, [role.name]);

    return firstOrFail(result, "RoleRepository.create");
  }

  async findById(
    roleId: string,
    tx: MaybeTransaction = null,
  ): Promise<RoleRow | null> {
    const query = `
      SELECT *
      FROM roles
      WHERE id = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<RoleRow>(query, [roleId]);

    return firstOrNull(result);
  }

  async findByName(
    name: string,
    tx: MaybeTransaction = null,
  ): Promise<RoleRow | null> {
    const query = `
      SELECT *
      FROM roles
      WHERE name = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<RoleRow>(query, [name]);

    return firstOrNull(result);
  }

  async delete(roleId: string, tx: MaybeTransaction = null): Promise<void> {
    const query = `
      DELETE FROM roles
      WHERE id = $1
    `;

    const executor = tx ?? this.db;

    await executor.query(query, [roleId]);
  }

  async addPermission(
    roleId: string,
    permissionId: string,
    tx: MaybeTransaction = null,
  ): Promise<void> {
    const query = `
      INSERT INTO role_permissions (
        "roleId",
        "permissionId"
      )
      VALUES ($1,$2)
    `;

    const executor = tx ?? this.db;

    await executor.query(query, [roleId, permissionId]);
  }

  async removePermission(
    roleId: string,
    permissionId: string,
    tx: MaybeTransaction = null,
  ): Promise<void> {
    const query = `
      DELETE FROM role_permissions
      WHERE "roleId" = $1
      AND "permissionId" = $2
    `;

    const executor = tx ?? this.db;

    await executor.query(query, [roleId, permissionId]);
  }

  async findPermissions(
    roleId: string,
    tx: MaybeTransaction = null,
  ): Promise<RolePermissionRow[]> {
    const query = `
      SELECT
        p.id,
        p.name
      FROM role_permissions rp
      JOIN permissions p
        ON p.id = rp."permissionId"
      WHERE rp."roleId" = $1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<RolePermissionRow>(query, [roleId]);

    return result.rows;
  }
}
