// src/modules/catalog/repositories/BrandRepository.js

const COLUMN_MAP = {
  name: "name",
  slug: "slug",
  logo: "logo",
  description: "description",
};

class BrandRepository {
  constructor(postgresClient) {
    this.db = postgresClient;
  }

  async create(brand, tx = null) {
    const query = `
      INSERT INTO brands (
        name,
        slug,
        logo,
        description
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [
      brand.name,
      brand.slug,
      brand.logo || null,
      brand.description || null,
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
      UPDATE brands
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
      DELETE FROM brands
      WHERE id = $1
    `;

    const executor = tx || this.db;

    await executor.query(query, [id]);
  }

  async findAll(tx = null) {
    const query = `
      SELECT *
      FROM brands
      ORDER BY name ASC
    `;

    const executor = tx || this.db;

    const result = await executor.query(query);

    return result.rows;
  }

  async findById(id, tx = null) {
    const query = `
      SELECT *
      FROM brands
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
      FROM brands
      WHERE slug = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [slug]);

    return result.rows[0] || null;
  }

  async findByName(name, tx = null) {
    const query = `
      SELECT *
      FROM brands
      WHERE name = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [name]);

    return result.rows[0] || null;
  }

  async countProducts(brandId, tx = null) {
    const query = `
      SELECT COUNT(*)::int AS count
      FROM products
      WHERE "brandId" = $1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [brandId]);

    return result.rows[0].count;
  }
}

module.exports = BrandRepository;
