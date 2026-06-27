// src/modules/identity/repositories/PermissionRepository.js

class PermissionRepository {
  constructor(postgresClient) {
    this.db = postgresClient;
  }

  async create(permission, tx = null) {
    const query = `
      INSERT INTO permissions (
        name
      )
      VALUES ($1)
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [permission.name]);

    return result.rows[0];
  }

  async findById(permissionId, tx = null) {
    const query = `
      SELECT *
      FROM permissions
      WHERE id = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [permissionId]);

    return result.rows[0] || null;
  }

  async findByName(name, tx = null) {
    const query = `
      SELECT *
      FROM permissions
      WHERE name = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [name]);

    return result.rows[0] || null;
  }

  async findAll(tx = null) {
    const query = `
      SELECT *
      FROM permissions
      ORDER BY name
    `;

    const executor = tx || this.db;

    const result = await executor.query(query);

    return result.rows;
  }

  async delete(permissionId, tx = null) {
    const query = `
      DELETE FROM permissions
      WHERE id = $1
    `;

    const executor = tx || this.db;

    await executor.query(query, [permissionId]);
  }
}

module.exports = PermissionRepository;
