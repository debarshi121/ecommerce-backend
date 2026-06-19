// src/modules/identity/repositories/RoleRepository.js

class RoleRepository {
  constructor(postgresClient) {
    this.db = postgresClient;
  }

  async create(role, tx = null) {
    const query = `
      INSERT INTO roles (
        name
      )
      VALUES ($1)
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [role.name]);

    return result.rows[0];
  }

  async findById(roleId, tx = null) {
    const query = `
      SELECT *
      FROM roles
      WHERE id = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [roleId]);

    return result.rows[0] || null;
  }

  async findByName(name, tx = null) {
    const query = `
      SELECT *
      FROM roles
      WHERE name = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [name]);

    return result.rows[0] || null;
  }

  async assignPermission(roleId, permissionId, tx = null) {
    const query = `
      INSERT INTO role_permissions (
        role_id,
        permission_id
      )
      VALUES ($1,$2)
    `;

    const executor = tx || this.db;

    await executor.query(query, [roleId, permissionId]);
  }

  async removePermission(roleId, permissionId, tx = null) {
    const query = `
      DELETE FROM role_permissions
      WHERE role_id = $1
      AND permission_id = $2
    `;

    const executor = tx || this.db;

    await executor.query(query, [roleId, permissionId]);
  }
}

module.exports = RoleRepository;
