// src/modules/inventory/repositories/ReservationRepository.ts

import type {
  MaybeTransaction,
  QueryExecutor,
} from "../../../shared/types/database";
import type {
  ReservationRow,
  WindowCounted,
} from "../../../shared/types/entities";
import type { Page } from "../../../shared/types/pagination";
import { firstOrFail, firstOrNull, toPage } from "../../../shared/utils/rows";

import { ReservationStatus, type ReservationStatusValue } from "../constants/ReservationStatus";
import type {
  CreateReservationInput,
  IReservationRepository,
  ProductReservationsQuery,
  ReservationStatusExtra,
} from "../contracts";

export class ReservationRepository implements IReservationRepository {
  private readonly db: QueryExecutor;

  constructor(postgresClient: QueryExecutor) {
    this.db = postgresClient;
  }

  async create(
    { orderId, productId, quantity, status }: CreateReservationInput,
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow> {
    const query = `
      INSERT INTO inventory_reservations (
        "orderId",
        "productId",
        quantity,
        status
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<ReservationRow>(query, [
      orderId,
      productId,
      quantity,
      status,
    ]);

    return firstOrFail(result, "ReservationRepository.create");
  }

  /**
   * `expiresAt` is only written when the caller explicitly supplies it, so a
   * plain status change (release/confirm/fail) leaves the original expiry
   * timestamp on the row as history.
   */
  async updateStatus(
    id: string,
    status: ReservationStatusValue,
    extra: ReservationStatusExtra = {},
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow | null> {
    const executor = tx ?? this.db;

    if (extra.expiresAt !== undefined) {
      const result = await executor.query<ReservationRow>(
        `
          UPDATE inventory_reservations
          SET status = $1, "expiresAt" = $2, "updatedAt" = NOW()
          WHERE id = $3
          RETURNING *
        `,
        [status, extra.expiresAt, id],
      );

      return firstOrNull(result);
    }

    const result = await executor.query<ReservationRow>(
      `
        UPDATE inventory_reservations
        SET status = $1, "updatedAt" = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [status, id],
    );

    return firstOrNull(result);
  }

  async findById(
    id: string,
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow | null> {
    const executor = tx ?? this.db;

    const result = await executor.query<ReservationRow>(
      `SELECT * FROM inventory_reservations WHERE id = $1 LIMIT 1`,
      [id],
    );

    return firstOrNull(result);
  }

  async findByOrderId(
    orderId: string,
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow[]> {
    const executor = tx ?? this.db;

    const result = await executor.query<ReservationRow>(
      `SELECT * FROM inventory_reservations WHERE "orderId" = $1 ORDER BY "createdAt" ASC`,
      [orderId],
    );

    return result.rows;
  }

  async findProductReservations(
    { productId, status, page, limit }: ProductReservationsQuery,
    tx: MaybeTransaction = null,
  ): Promise<Page<ReservationRow>> {
    const executor = tx ?? this.db;

    const conditions = [`"productId" = $1`];
    const params: unknown[] = [productId];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    const offset = (page - 1) * limit;

    params.push(limit);
    const limitIndex = params.length;

    params.push(offset);
    const offsetIndex = params.length;

    const query = `
      SELECT *, COUNT(*) OVER() AS "totalCount"
      FROM inventory_reservations
      WHERE ${conditions.join(" AND ")}
      ORDER BY "createdAt" DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const result = await executor.query<ReservationRow & WindowCounted>(
      query,
      params,
    );

    return toPage<ReservationRow>(result);
  }

  // Backs the expiry sweep: RESERVED reservations whose TTL has passed and
  // that no one has confirmed or explicitly released yet.
  async findPendingExpired(
    limit = 100,
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow[]> {
    const executor = tx ?? this.db;

    const result = await executor.query<ReservationRow>(
      `
        SELECT *
        FROM inventory_reservations
        WHERE status = $1 AND "expiresAt" IS NOT NULL AND "expiresAt" < NOW()
        ORDER BY "expiresAt" ASC
        LIMIT $2
      `,
      [ReservationStatus.RESERVED, limit],
    );

    return result.rows;
  }

  async delete(id: string, tx: MaybeTransaction = null): Promise<void> {
    const executor = tx ?? this.db;

    await executor.query(`DELETE FROM inventory_reservations WHERE id = $1`, [
      id,
    ]);
  }
}
