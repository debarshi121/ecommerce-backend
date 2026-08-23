// src/modules/inventory/repositories/InventoryRepository.js

class InventoryRepository {
  constructor(postgresClient) {
    this.db = postgresClient;
  }

  async createInventory({ productId, availableQuantity = 0, reservedQuantity = 0 }, tx = null) {
    const query = `
      INSERT INTO inventory (
        "productId",
        "availableQuantity",
        "reservedQuantity"
      )
      VALUES ($1,$2,$3)
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [
      productId,
      availableQuantity,
      reservedQuantity,
    ]);

    return result.rows[0];
  }

  async findByProductId(productId, tx = null) {
    const query = `
      SELECT *
      FROM inventory
      WHERE "productId" = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [productId]);

    return result.rows[0] || null;
  }

  async findById(id, tx = null) {
    const query = `
      SELECT *
      FROM inventory
      WHERE id = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [id]);

    return result.rows[0] || null;
  }

  async exists(productId, tx = null) {
    const query = `
      SELECT 1
      FROM inventory
      WHERE "productId" = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [productId]);

    return result.rows.length > 0;
  }

  // Direct, non-versioned write. Bypasses optimistic locking entirely, so it
  // must NEVER be called from a concurrent business flow — it exists only as
  // an escape hatch for offline reconciliation tooling run against a row no
  // other writer can touch. Every business mutation goes through
  // optimisticUpdate()/incrementAvailable()/decrementAvailable()/etc. below.
  async updateStock(id, { availableQuantity, reservedQuantity }, tx = null) {
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

    const executor = tx || this.db;

    const result = await executor.query(query, [availableQuantity, reservedQuantity, id]);

    return result.rows[0] || null;
  }

  // The canonical concurrency-safe write: sets both counters to absolute
  // values in a single statement, gated on the version the caller last read.
  // Returns null (never throws) when zero rows matched — i.e. another writer
  // committed first — so the service layer can re-read and retry.
  async optimisticUpdate(id, { availableQuantity, reservedQuantity, expectedVersion }, tx = null) {
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

    const executor = tx || this.db;

    const result = await executor.query(query, [
      availableQuantity,
      reservedQuantity,
      id,
      expectedVersion,
    ]);

    return result.rows[0] || null;
  }

  async incrementAvailable(id, amount, expectedVersion, tx = null) {
    const query = `
      UPDATE inventory
      SET
        "availableQuantity" = "availableQuantity" + $1,
        version = version + 1,
        "updatedAt" = NOW()
      WHERE id = $2 AND version = $3
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [amount, id, expectedVersion]);

    return result.rows[0] || null;
  }

  async decrementAvailable(id, amount, expectedVersion, tx = null) {
    const query = `
      UPDATE inventory
      SET
        "availableQuantity" = "availableQuantity" - $1,
        version = version + 1,
        "updatedAt" = NOW()
      WHERE id = $2 AND version = $3 AND "availableQuantity" >= $1
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [amount, id, expectedVersion]);

    return result.rows[0] || null;
  }

  async incrementReserved(id, amount, expectedVersion, tx = null) {
    const query = `
      UPDATE inventory
      SET
        "reservedQuantity" = "reservedQuantity" + $1,
        version = version + 1,
        "updatedAt" = NOW()
      WHERE id = $2 AND version = $3
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [amount, id, expectedVersion]);

    return result.rows[0] || null;
  }

  async decrementReserved(id, amount, expectedVersion, tx = null) {
    const query = `
      UPDATE inventory
      SET
        "reservedQuantity" = "reservedQuantity" - $1,
        version = version + 1,
        "updatedAt" = NOW()
      WHERE id = $2 AND version = $3 AND "reservedQuantity" >= $1
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [amount, id, expectedVersion]);

    return result.rows[0] || null;
  }

  async findLowStock({ threshold, page, limit, sortDir = "asc" }, tx = null) {
    const executor = tx || this.db;

    const offset = (page - 1) * limit;
    const direction = sortDir === "desc" ? "DESC" : "ASC";

    const query = `
      SELECT *, COUNT(*) OVER() AS "totalCount"
      FROM inventory
      WHERE "availableQuantity" <= $1
      ORDER BY "availableQuantity" ${direction}
      LIMIT $2 OFFSET $3
    `;

    const result = await executor.query(query, [threshold, limit, offset]);

    const total = result.rows[0] ? Number(result.rows[0].totalCount) : 0;

    const items = result.rows.map(({ totalCount, ...row }) => row);

    return { items, total };
  }
}

module.exports = InventoryRepository;
