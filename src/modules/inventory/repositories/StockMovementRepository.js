// src/modules/inventory/repositories/StockMovementRepository.js

class StockMovementRepository {
  constructor(postgresClient) {
    this.db = postgresClient;
  }

  async createMovement({ productId, movementType, quantity, referenceId, reason }, tx = null) {
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

    const executor = tx || this.db;

    const result = await executor.query(query, [
      productId,
      movementType,
      quantity,
      referenceId || null,
      reason || null,
    ]);

    return result.rows[0];
  }

  async findHistory({ page, limit, sortDir = "desc" }, tx = null) {
    const executor = tx || this.db;

    const offset = (page - 1) * limit;
    const direction = sortDir === "asc" ? "ASC" : "DESC";

    const query = `
      SELECT *, COUNT(*) OVER() AS "totalCount"
      FROM stock_movements
      ORDER BY "createdAt" ${direction}
      LIMIT $1 OFFSET $2
    `;

    const result = await executor.query(query, [limit, offset]);

    const total = result.rows[0] ? Number(result.rows[0].totalCount) : 0;

    const items = result.rows.map(({ totalCount, ...row }) => row);

    return { items, total };
  }

  async findProductHistory({ productId, page, limit, sortDir = "desc", movementType }, tx = null) {
    const executor = tx || this.db;

    const conditions = [`"productId" = $1`];
    const params = [productId];

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

    const result = await executor.query(query, params);

    const total = result.rows[0] ? Number(result.rows[0].totalCount) : 0;

    const items = result.rows.map(({ totalCount, ...row }) => row);

    return { items, total };
  }
}

module.exports = StockMovementRepository;
