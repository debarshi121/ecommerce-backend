// src/modules/catalog/repositories/CategoryRepository.js

const COLUMN_MAP = {
  name: "name",
  slug: "slug",
  parentId: '"parentId"',
  description: "description",
};

class CategoryRepository {
  constructor(postgresClient) {
    this.db = postgresClient;
  }

  async create(category, tx = null) {
    const query = `
      INSERT INTO categories (
        "parentId",
        name,
        slug,
        description
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [
      category.parentId || null,
      category.name,
      category.slug,
      category.description || null,
    ]);

    return result.rows[0];
  }

  async update(id, fields, tx = null) {
    const columns = Object.keys(fields).filter((key) => COLUMN_MAP[key]);

    if (columns.length === 0) {
      return this.findById(id, tx);
    }

    const setClauses = columns.map((key, index) => `${COLUMN_MAP[key]} = $${index + 2}`);

    const values = columns.map((key) => fields[key]);

    const query = `
      UPDATE categories
      SET ${setClauses.join(", ")}, "updatedAt" = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [id, ...values]);

    return result.rows[0] || null;
  }

  async delete(id, tx = null) {
    const query = `
      DELETE FROM categories
      WHERE id = $1
    `;

    const executor = tx || this.db;

    await executor.query(query, [id]);
  }

  async findById(id, tx = null) {
    const query = `
      SELECT *
      FROM categories
      WHERE id = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [id]);

    return result.rows[0] || null;
  }

  async findBySlug(slug, tx = null) {
    const query = `
      SELECT *
      FROM categories
      WHERE slug = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [slug]);

    return result.rows[0] || null;
  }

  async children(parentId, tx = null) {
    const executor = tx || this.db;

    if (!parentId) {
      const result = await executor.query(
        `SELECT * FROM categories WHERE "parentId" IS NULL ORDER BY name ASC`,
      );

      return result.rows;
    }

    const result = await executor.query(
      `SELECT * FROM categories WHERE "parentId" = $1 ORDER BY name ASC`,
      [parentId],
    );

    return result.rows;
  }

  async countProducts(categoryId, tx = null) {
    const query = `
      SELECT COUNT(*)::int AS count
      FROM products
      WHERE "categoryId" = $1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [categoryId]);

    return result.rows[0].count;
  }

  async tree(tx = null) {
    const query = `
      WITH RECURSIVE category_tree AS (
        SELECT id, "parentId", name, slug, description, "createdAt", "updatedAt"
        FROM categories
        WHERE "parentId" IS NULL

        UNION ALL

        SELECT c.id, c."parentId", c.name, c.slug, c.description, c."createdAt", c."updatedAt"
        FROM categories c
        INNER JOIN category_tree ct ON c."parentId" = ct.id
      )
      SELECT *
      FROM category_tree
      ORDER BY name ASC
    `;

    const executor = tx || this.db;

    const result = await executor.query(query);

    return result.rows;
  }
}

module.exports = CategoryRepository;
