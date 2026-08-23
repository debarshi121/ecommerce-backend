// src/modules/inventory/repositories/InventoryRepository.ts

import type {
  MaybeTransaction,
  QueryExecutor,
} from "../../../shared/types/database";
import type {
  InventoryRow,
  WindowCounted,
} from "../../../shared/types/entities";
import type { Page } from "../../../shared/types/pagination";
import { firstOrFail, firstOrNull, toPage } from "../../../shared/utils/rows";
import type {
  AbsoluteQuantities,
  CreateInventoryInput,
  IInventoryRepository,
  LowStockQuery,
  OptimisticUpdateInput,
} from "../contracts";

export class InventoryRepository implements IInventoryRepository {
  private readonly db: QueryExecutor;

  constructor(postgresClient: QueryExecutor) {
    this.db = postgresClient;
  }

  async createInventory(
    {
      productId,
      availableQuantity = 0,
      reservedQuantity = 0,
    }: CreateInventoryInput,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow> {
    const query = `
      INSERT INTO inventory (
        "productId",
        "availableQuantity",
        "reservedQuantity"
      )
      VALUES ($1,$2,$3)
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InventoryRow>(query, [
      productId,
      availableQuantity,
      reservedQuantity,
    ]);

    return firstOrFail(result, "InventoryRepository.createInventory");
  }

  async findByProductId(
    productId: string,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow | null> {
    const query = `
      SELECT *
      FROM inventory
      WHERE "productId" = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InventoryRow>(query, [productId]);

    return firstOrNull(result);
  }

  async findById(
    id: string,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow | null> {
    const query = `
      SELECT *
      FROM inventory
      WHERE id = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InventoryRow>(query, [id]);

    return firstOrNull(result);
  }

  async exists(
    productId: string,
    tx: MaybeTransaction = null,
  ): Promise<boolean> {
    const query = `
      SELECT 1
      FROM inventory
      WHERE "productId" = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query(query, [productId]);

    return result.rows.length > 0;
  }

  // Direct, non-versioned write. Bypasses optimistic locking entirely, so it
  // must NEVER be called from a concurrent business flow — it exists only as
  // an escape hatch for offline reconciliation tooling run against a row no
  // other writer can touch. Every business mutation goes through
  // optimisticUpdate()/incrementAvailable()/decrementAvailable()/etc. below.
  async updateStock(
    id: string,
    { availableQuantity, reservedQuantity }: AbsoluteQuantities,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow | null> {
    const query = `
      UPDATE inventory
      SET
        "availableQuantity" = $1,
        "reservedQuantity" = $2,
        version = version + 1,
        "updatedAt" = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InventoryRow>(query, [
      availableQuantity,
      reservedQuantity,
      id,
    ]);

    return firstOrNull(result);
  }

  // The canonical concurrency-safe write: sets both counters to absolute
  // values in a single statement, gated on the version the caller last read.
  // Returns null (never throws) when zero rows matched — i.e. another writer
  // committed first — so the service layer can re-read and retry.
  async optimisticUpdate(
    id: string,
    {
      availableQuantity,
      reservedQuantity,
      expectedVersion,
    }: OptimisticUpdateInput,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow | null> {
    const query = `
      UPDATE inventory
      SET
        "availableQuantity" = $1,
        "reservedQuantity" = $2,
        version = version + 1,
        "updatedAt" = NOW()
      WHERE id = $3 AND version = $4
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InventoryRow>(query, [
      availableQuantity,
      reservedQuantity,
      id,
      expectedVersion,
    ]);

    return firstOrNull(result);
  }

  async incrementAvailable(
    id: string,
    amount: number,
    expectedVersion: number,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow | null> {
    const query = `
      UPDATE inventory
      SET
        "availableQuantity" = "availableQuantity" + $1,
        version = version + 1,
        "updatedAt" = NOW()
      WHERE id = $2 AND version = $3
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InventoryRow>(query, [
      amount,
      id,
      expectedVersion,
    ]);

    return firstOrNull(result);
  }

  async decrementAvailable(
    id: string,
    amount: number,
    expectedVersion: number,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow | null> {
    const query = `
      UPDATE inventory
      SET
        "availableQuantity" = "availableQuantity" - $1,
        version = version + 1,
        "updatedAt" = NOW()
      WHERE id = $2 AND version = $3 AND "availableQuantity" >= $1
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InventoryRow>(query, [
      amount,
      id,
      expectedVersion,
    ]);

    return firstOrNull(result);
  }

  async incrementReserved(
    id: string,
    amount: number,
    expectedVersion: number,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow | null> {
    const query = `
      UPDATE inventory
      SET
        "reservedQuantity" = "reservedQuantity" + $1,
        version = version + 1,
        "updatedAt" = NOW()
      WHERE id = $2 AND version = $3
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InventoryRow>(query, [
      amount,
      id,
      expectedVersion,
    ]);

    return firstOrNull(result);
  }

  async decrementReserved(
    id: string,
    amount: number,
    expectedVersion: number,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow | null> {
    const query = `
      UPDATE inventory
      SET
        "reservedQuantity" = "reservedQuantity" - $1,
        version = version + 1,
        "updatedAt" = NOW()
      WHERE id = $2 AND version = $3 AND "reservedQuantity" >= $1
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InventoryRow>(query, [
      amount,
      id,
      expectedVersion,
    ]);

    return firstOrNull(result);
  }

  async findLowStock(
    { threshold, page, limit, sortDir = "asc" }: LowStockQuery,
    tx: MaybeTransaction = null,
  ): Promise<Page<InventoryRow>> {
    const executor = tx ?? this.db;

    const offset = (page - 1) * limit;
    const direction = sortDir === "desc" ? "DESC" : "ASC";

    const query = `
      SELECT *, COUNT(*) OVER() AS "totalCount"
      FROM inventory
      WHERE "availableQuantity" <= $1
      ORDER BY "availableQuantity" ${direction}
      LIMIT $2 OFFSET $3
    `;

    const result = await executor.query<InventoryRow & WindowCounted>(query, [
      threshold,
      limit,
      offset,
    ]);

    return toPage<InventoryRow>(result);
  }
}
