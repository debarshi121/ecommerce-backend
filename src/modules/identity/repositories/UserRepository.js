// src/modules/identity/repositories/UserRepository.js

class UserRepository {
  constructor(postgresClient) {
    this.db = postgresClient;
  }

  async findByEmail(email, tx = null) {
    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u."passwordHash",
        u."roleId",
        u."isActive",
        u."tokenVersion",
        r.name as role
      FROM users u
      LEFT JOIN roles r
        ON u."roleId" = r.id
      WHERE u.email = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [email]);

    return result.rows[0] || null;
  }

  async findById(userId, tx = null) {
    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u."roleId",
        u."isActive",
        u."tokenVersion",
        r.name as role
      FROM users u
      LEFT JOIN roles r
        ON u."roleId" = r.id
      WHERE u.id = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [userId]);

    return result.rows[0] || null;
  }

  async create(user, tx = null) {
    const query = `
      INSERT INTO users (
        name,
        email,
        "passwordHash",
        "roleId"
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;

    const values = [user.name, user.email, user.passwordHash, user.roleId];

    const executor = tx || this.db;

    const result = await executor.query(query, values);

    return result.rows[0];
  }

  async updateLastLogin(userId, tx = null) {
    const query = `
      UPDATE users
      SET updated_at = NOW()
      WHERE id = $1
    `;

    const executor = tx || this.db;

    await executor.query(query, [userId]);
  }

  async findPermissionsById(userId, tx = null) {
    const query = `
      SELECT p.name
      FROM users u
      JOIN roles r
        ON u."roleId" = r.id
      JOIN role_permissions rp
        ON rp."roleId" = r.id
      JOIN permissions p
        ON p.id = rp."permissionId"
      WHERE u.id = $1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [userId]);

    return result.rows;
  }

  async incrementTokenVersion(userId, tx = null) {
    const query = `
      UPDATE users
      SET "tokenVersion" = "tokenVersion" + 1
      WHERE id = $1
    `;

    const executor = tx || this.db;

    await executor.query(query, [userId]);
  }
}

module.exports = UserRepository;
