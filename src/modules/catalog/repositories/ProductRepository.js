// src/modules/catalog/repositories/ProductRepository.js

const COLUMN_MAP = {
  name: "name",
  slug: "slug",
  shortDescription: '"shortDescription"',
  description: "description",
  categoryId: '"categoryId"',
  brandId: '"brandId"',
  status: "status",
  metadata: "metadata",
};

const SORTABLE_COLUMNS = {
  name: "p.name",
  sku: "p.sku",
  status: "p.status",
  createdAt: 'p."createdAt"',
  updatedAt: 'p."updatedAt"',
};

class ProductRepository {
  constructor(postgresClient) {
    this.db = postgresClient;
  }

  async create(product, tx = null) {
    const query = `
      INSERT INTO products (
        sku,
        slug,
        name,
        "shortDescription",
        description,
        "categoryId",
        "brandId",
        status,
        metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [
      product.sku,
      product.slug,
      product.name,
      product.shortDescription || null,
      product.description || null,
      product.categoryId || null,
      product.brandId || null,
      product.status,
      JSON.stringify(product.metadata || {}),
    ]);

    return result.rows[0];
  }

  async update(id, fields, tx = null) {
    const columns = Object.keys(fields).filter((key) => COLUMN_MAP[key]);

    if (columns.length === 0) {
      return this.findRawById(id, tx);
    }

    const setClauses = columns.map((key, index) => `${COLUMN_MAP[key]} = $${index + 2}`);

    const values = columns.map((key) =>
      key === "metadata" ? JSON.stringify(fields[key]) : fields[key],
    );

    const query = `
      UPDATE products
      SET ${setClauses.join(", ")}, "updatedAt" = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [id, ...values]);

    return result.rows[0] || null;
  }

  async archive(id, tx = null) {
    const query = `
      UPDATE products
      SET status = 'ARCHIVED', "updatedAt" = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [id]);

    return result.rows[0] || null;
  }

  async findRawById(id, tx = null) {
    const query = `
      SELECT *
      FROM products
      WHERE id = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [id]);

    return result.rows[0] || null;
  }

  async findById(id, tx = null) {
    const executor = tx || this.db;

    const query = `
      SELECT
        p.*,
        CASE WHEN c.id IS NOT NULL
          THEN json_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
        END AS category,
        CASE WHEN b.id IS NOT NULL
          THEN json_build_object('id', b.id, 'name', b.name, 'slug', b.slug)
        END AS brand
      FROM products p
      LEFT JOIN categories c ON c.id = p."categoryId"
      LEFT JOIN brands b ON b.id = p."brandId"
      WHERE p.id = $1
      LIMIT 1
    `;

    const result = await executor.query(query, [id]);

    const product = result.rows[0];

    if (!product) {
      return null;
    }

    product.images = await this.findImagesByProductId(id, tx);

    return product;
  }

  async findBySlug(slug, tx = null) {
    const executor = tx || this.db;

    const query = `
      SELECT
        p.*,
        CASE WHEN c.id IS NOT NULL
          THEN json_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
        END AS category,
        CASE WHEN b.id IS NOT NULL
          THEN json_build_object('id', b.id, 'name', b.name, 'slug', b.slug)
        END AS brand
      FROM products p
      LEFT JOIN categories c ON c.id = p."categoryId"
      LEFT JOIN brands b ON b.id = p."brandId"
      WHERE p.slug = $1
      LIMIT 1
    `;

    const result = await executor.query(query, [slug]);

    const product = result.rows[0];

    if (!product) {
      return null;
    }

    product.images = await this.findImagesByProductId(product.id, tx);

    return product;
  }

  async findBySku(sku, tx = null) {
    const query = `
      SELECT *
      FROM products
      WHERE sku = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [sku]);

    return result.rows[0] || null;
  }

  async exists({ sku, slug, excludeId } = {}, tx = null) {
    const conditions = [];
    const params = [];

    if (sku) {
      params.push(sku);
      conditions.push(`sku = $${params.length}`);
    }

    if (slug) {
      params.push(slug);
      conditions.push(`slug = $${params.length}`);
    }

    if (conditions.length === 0) {
      return false;
    }

    let query = `SELECT 1 FROM products WHERE (${conditions.join(" OR ")})`;

    if (excludeId) {
      params.push(excludeId);
      query += ` AND id != $${params.length}`;
    }

    query += " LIMIT 1";

    const executor = tx || this.db;

    const result = await executor.query(query, params);

    return result.rows.length > 0;
  }

  async search(
    { name, sku, brandId, categoryId, status, page, limit, sortBy, sortDir },
    tx = null,
  ) {
    const conditions = [];
    const params = [];

    if (name) {
      params.push(`%${name}%`);
      conditions.push(`p.name ILIKE $${params.length}`);
    }

    if (sku) {
      params.push(`%${sku}%`);
      conditions.push(`p.sku ILIKE $${params.length}`);
    }

    if (brandId) {
      params.push(brandId);
      conditions.push(`p."brandId" = $${params.length}`);
    }

    if (categoryId) {
      params.push(categoryId);
      conditions.push(`p."categoryId" = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const sortColumn = SORTABLE_COLUMNS[sortBy] || 'p."createdAt"';
    const sortDirection = sortDir === "asc" ? "ASC" : "DESC";

    const offset = (page - 1) * limit;

    params.push(limit);
    const limitIndex = params.length;

    params.push(offset);
    const offsetIndex = params.length;

    const query = `
      SELECT
        p.*,
        COUNT(*) OVER() AS "totalCount",
        CASE WHEN c.id IS NOT NULL
          THEN json_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
        END AS category,
        CASE WHEN b.id IS NOT NULL
          THEN json_build_object('id', b.id, 'name', b.name, 'slug', b.slug)
        END AS brand
      FROM products p
      LEFT JOIN categories c ON c.id = p."categoryId"
      LEFT JOIN brands b ON b.id = p."brandId"
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, params);

    const total = result.rows[0] ? Number(result.rows[0].totalCount) : 0;

    const items = result.rows.map((row) => {
      const { totalCount, ...product } = row;
      return product;
    });

    return { items, total };
  }

  async findImagesByProductId(productId, tx = null) {
    const query = `
      SELECT *
      FROM product_images
      WHERE "productId" = $1
      ORDER BY position ASC
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [productId]);

    return result.rows;
  }

  async addImages(productId, images, tx = null) {
    const executor = tx || this.db;

    const maxPositionResult = await executor.query(
      `SELECT COALESCE(MAX(position), -1) AS "maxPosition" FROM product_images WHERE "productId" = $1`,
      [productId],
    );

    let nextPosition = Number(maxPositionResult.rows[0].maxPosition) + 1;

    const inserted = [];

    for (const image of images) {
      const result = await executor.query(
        `
          INSERT INTO product_images (
            "productId",
            "imageUrl",
            "altText",
            position
          )
          VALUES ($1,$2,$3,$4)
          RETURNING *
        `,
        [productId, image.imageUrl, image.altText || null, nextPosition],
      );

      inserted.push(result.rows[0]);

      nextPosition += 1;
    }

    return inserted;
  }

  async replaceImages(productId, images, tx = null) {
    const executor = tx || this.db;

    await executor.query(`DELETE FROM product_images WHERE "productId" = $1`, [productId]);

    const inserted = [];

    let position = 0;

    for (const image of images) {
      const result = await executor.query(
        `
          INSERT INTO product_images (
            "productId",
            "imageUrl",
            "altText",
            position
          )
          VALUES ($1,$2,$3,$4)
          RETURNING *
        `,
        [productId, image.imageUrl, image.altText || null, position],
      );

      inserted.push(result.rows[0]);

      position += 1;
    }

    return inserted;
  }

  async removeImage(productId, imageId, tx = null) {
    const query = `
      DELETE FROM product_images
      WHERE id = $1
      AND "productId" = $2
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [imageId, productId]);

    return result.rows[0] || null;
  }
}

module.exports = ProductRepository;
