// src/modules/identity/repositories/PermissionRepository.ts

import type { MaybeTransaction, QueryExecutor } from "../../../shared/types/database";
import type { PermissionRow } from "../../../shared/types/entities";
import { firstOrFail, firstOrNull } from "../../../shared/utils/rows";
import type { IPermissionRepository } from "../contracts";

export class PermissionRepository implements IPermissionRepository {
  private readonly db: QueryExecutor;

  constructor(postgresClient: QueryExecutor) {
    this.db = postgresClient;
  }

  async create(
    permission: { name: string },
    tx: MaybeTransaction = null,
  ): Promise<PermissionRow> {
    const query = `
      INSERT INTO permissions (
        name
      )
      VALUES ($1)
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<PermissionRow>(query, [
      permission.name,
    ]);

    return firstOrFail(result, "PermissionRepository.create");
  }

  async findById(
    permissionId: string,
    tx: MaybeTransaction = null,
  ): Promise<PermissionRow | null> {
    const query = `
      SELECT *
      FROM permissions
      WHERE id = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<PermissionRow>(query, [permissionId]);

    return firstOrNull(result);
  }

  async findByName(
    name: string,
    tx: MaybeTransaction = null,
  ): Promise<PermissionRow | null> {
    const query = `
      SELECT *
      FROM permissions
      WHERE name = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<PermissionRow>(query, [name]);

    return firstOrNull(result);
  }

  async findAll(tx: MaybeTransaction = null): Promise<PermissionRow[]> {
    const query = `
      SELECT *
      FROM permissions
      ORDER BY name
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<PermissionRow>(query);

    return result.rows;
  }

  async delete(
    permissionId: string,
    tx: MaybeTransaction = null,
  ): Promise<void> {
    const query = `
      DELETE FROM permissions
      WHERE id = $1
    `;

    const executor = tx ?? this.db;

    await executor.query(query, [permissionId]);
  }
}
