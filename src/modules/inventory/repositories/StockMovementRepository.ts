// src/modules/inventory/repositories/StockMovementRepository.ts

import type {
  MaybeTransaction,
  QueryExecutor,
} from "../../../shared/types/database";
import type {
  StockMovementRow,
  WindowCounted,
} from "../../../shared/types/entities";
import type { Page } from "../../../shared/types/pagination";
import { firstOrFail, toPage } from "../../../shared/utils/rows";
import type {
  CreateStockMovementInput,
  IStockMovementRepository,
  ProductStockHistoryQuery,
  StockHistoryQuery,
} from "../contracts";

/**
 * Append-only audit ledger: there is deliberately no update or delete path,
 * so history can only ever be added to.
 */
export class StockMovementRepository implements IStockMovementRepository {
  private readonly db: QueryExecutor;

  constructor(postgresClient: QueryExecutor) {
    this.db = postgresClient;
  }

  async createMovement(
    {
      productId,
      movementType,
      quantity,
      referenceId,
      reason,
    }: CreateStockMovementInput,
    tx: MaybeTransaction = null,
  ): Promise<StockMovementRow> {
    const query = `
      INSERT INTO stock_movements (
        "productId",
        "movementType",
        quantity,
        "referenceId",
        reason
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<StockMovementRow>(query, [
      productId,
      movementType,
      quantity,
      referenceId || null,
      reason || null,
    ]);

    return firstOrFail(result, "StockMovementRepository.createMovement");
  }

  async findHistory(
    { page, limit, sortDir = "desc" }: StockHistoryQuery,
    tx: MaybeTransaction = null,
  ): Promise<Page<StockMovementRow>> {
    const executor = tx ?? this.db;

    const offset = (page - 1) * limit;
    const direction = sortDir === "asc" ? "ASC" : "DESC";

    const query = `
      SELECT *, COUNT(*) OVER() AS "totalCount"
      FROM stock_movements
      ORDER BY "createdAt" ${direction}
      LIMIT $1 OFFSET $2
    `;

    const result = await executor.query<StockMovementRow & WindowCounted>(
      query,
      [limit, offset],
    );

    return toPage<StockMovementRow>(result);
  }

  async findProductHistory(
    {
      productId,
      page,
      limit,
      sortDir = "desc",
      movementType,
    }: ProductStockHistoryQuery,
    tx: MaybeTransaction = null,
  ): Promise<Page<StockMovementRow>> {
    const executor = tx ?? this.db;

    const conditions = [`"productId" = $1`];
    const params: unknown[] = [productId];

    if (movementType) {
      params.push(movementType);
      conditions.push(`"movementType" = $${params.length}`);
    }

    const offset = (page - 1) * limit;
    const direction = sortDir === "asc" ? "ASC" : "DESC";

    params.push(limit);
    const limitIndex = params.length;

    params.push(offset);
    const offsetIndex = params.length;

    const query = `
      SELECT *, COUNT(*) OVER() AS "totalCount"
      FROM stock_movements
      WHERE ${conditions.join(" AND ")}
      ORDER BY "createdAt" ${direction}
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const result = await executor.query<StockMovementRow & WindowCounted>(
      query,
      params,
    );

    return toPage<StockMovementRow>(result);
  }
}
