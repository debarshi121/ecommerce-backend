// src/modules/inventory/repositories/ReservationRepository.js

const ReservationStatus = require("../constants/ReservationStatus");

class ReservationRepository {
  constructor(postgresClient) {
    this.db = postgresClient;
  }

  async create({ orderId, productId, quantity, status }, tx = null) {
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

    const executor = tx || this.db;

    const result = await executor.query(query, [orderId, productId, quantity, status]);

    return result.rows[0];
  }

  async updateStatus(id, status, extra = {}, tx = null) {
    const executor = tx || this.db;

    if (extra.expiresAt !== undefined) {
      const result = await executor.query(
        `
          UPDATE inventory_reservations
          SET status = $1, "expiresAt" = $2, "updatedAt" = NOW()
          WHERE id = $3
          RETURNING *
        `,
        [status, extra.expiresAt, id],
      );

      return result.rows[0] || null;
    }

    const result = await executor.query(
      `
        UPDATE inventory_reservations
        SET status = $1, "updatedAt" = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [status, id],
    );

    return result.rows[0] || null;
  }

  async findById(id, tx = null) {
    const executor = tx || this.db;

    const result = await executor.query(
      `SELECT * FROM inventory_reservations WHERE id = $1 LIMIT 1`,
      [id],
    );

    return result.rows[0] || null;
  }

  async findByOrderId(orderId, tx = null) {
    const executor = tx || this.db;

    const result = await executor.query(
      `SELECT * FROM inventory_reservations WHERE "orderId" = $1 ORDER BY "createdAt" ASC`,
      [orderId],
    );

    return result.rows;
  }

  async findProductReservations({ productId, status, page, limit }, tx = null) {
    const executor = tx || this.db;

    const conditions = [`"productId" = $1`];
    const params = [productId];

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

    const result = await executor.query(query, params);

    const total = result.rows[0] ? Number(result.rows[0].totalCount) : 0;

    const items = result.rows.map(({ totalCount, ...row }) => row);

    return { items, total };
  }

  // Backs the expiry sweep: RESERVED reservations whose TTL has passed and
  // that no one has confirmed or explicitly released yet.
  async findPendingExpired(limit = 100, tx = null) {
    const executor = tx || this.db;

    const result = await executor.query(
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

  async delete(id, tx = null) {
    const executor = tx || this.db;

    await executor.query(`DELETE FROM inventory_reservations WHERE id = $1`, [id]);
  }
}

module.exports = ReservationRepository;
