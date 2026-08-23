// src/modules/catalog/repositories/ProductRepository.ts

import type {
  MaybeTransaction,
  QueryExecutor,
} from "../../../shared/types/database";
import type {
  ProductAggregateRow,
  ProductImageRow,
  ProductRow,
  WindowCounted,
} from "../../../shared/types/entities";
import type { Page } from "../../../shared/types/pagination";
import { firstOrFail, firstOrNull, toPage } from "../../../shared/utils/rows";
import {
  buildUpdateAssignments,
  type ColumnMap,
  type ValueEncoders,
} from "../../../shared/utils/sqlUpdate";
import type {
  CreateProductInput,
  IProductRepository,
  ProductExistsQuery,
  ProductSearchQuery,
  ProductImageInput,
  ProductSortField,
  UpdateProductPatch,
} from "../contracts";

const COLUMN_MAP: ColumnMap<UpdateProductPatch> = {
  name: "name",
  slug: "slug",
  shortDescription: '"shortDescription"',
  description: "description",
  categoryId: '"categoryId"',
  brandId: '"brandId"',
  status: "status",
  metadata: "metadata",
};

const VALUE_ENCODERS: ValueEncoders<UpdateProductPatch> = {
  metadata: (value) => JSON.stringify(value),
};

/**
 * Allow-list of orderable columns. A client-supplied `sortBy` is only ever
 * used as a key into this map, never interpolated, so the ORDER BY clause
 * cannot be injected into.
 */
const SORTABLE_COLUMNS: Record<ProductSortField, string> = {
  name: "p.name",
  sku: "p.sku",
  status: "p.status",
  createdAt: 'p."createdAt"',
  updatedAt: 'p."updatedAt"',
};

const DEFAULT_SORT_COLUMN = 'p."createdAt"';

/** Shared projection: the product plus its category/brand summaries. */
const PRODUCT_WITH_RELATIONS = `
  p.*,
  CASE WHEN c.id IS NOT NULL
    THEN json_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
  END AS category,
  CASE WHEN b.id IS NOT NULL
    THEN json_build_object('id', b.id, 'name', b.name, 'slug', b.slug)
  END AS brand
`;

const PRODUCT_JOINS = `
  FROM products p
  LEFT JOIN categories c ON c.id = p."categoryId"
  LEFT JOIN brands b ON b.id = p."brandId"
`;

export class ProductRepository implements IProductRepository {
  private readonly db: QueryExecutor;

  constructor(postgresClient: QueryExecutor) {
    this.db = postgresClient;
  }

  async create(
    product: CreateProductInput,
    tx: MaybeTransaction = null,
  ): Promise<ProductRow> {
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

    const executor = tx ?? this.db;

    const result = await executor.query<ProductRow>(query, [
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

    return firstOrFail(result, "ProductRepository.create");
  }

  async update(
    id: string,
    fields: UpdateProductPatch,
    tx: MaybeTransaction = null,
  ): Promise<ProductRow | null> {
    const { assignments, values } = buildUpdateAssignments(fields, COLUMN_MAP, {
      encoders: VALUE_ENCODERS,
    });

    if (assignments.length === 0) {
      return this.findRawById(id, tx);
    }

    const query = `
      UPDATE products
      SET ${assignments.join(", ")}, "updatedAt" = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<ProductRow>(query, [id, ...values]);

    return firstOrNull(result);
  }

  async archive(
    id: string,
    tx: MaybeTransaction = null,
  ): Promise<ProductRow | null> {
    const query = `
      UPDATE products
      SET status = 'ARCHIVED', "updatedAt" = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<ProductRow>(query, [id]);

    return firstOrNull(result);
  }

  async findRawById(
    id: string,
    tx: MaybeTransaction = null,
  ): Promise<ProductRow | null> {
    const query = `
      SELECT *
      FROM products
      WHERE id = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<ProductRow>(query, [id]);

    return firstOrNull(result);
  }

  async findById(
    id: string,
    tx: MaybeTransaction = null,
  ): Promise<ProductAggregateRow | null> {
    const executor = tx ?? this.db;

    const query = `
      SELECT
        ${PRODUCT_WITH_RELATIONS}
      ${PRODUCT_JOINS}
      WHERE p.id = $1
      LIMIT 1
    `;

    const result = await executor.query<ProductAggregateRow>(query, [id]);

    const product = firstOrNull(result);

    if (!product) {
      return null;
    }

    product.images = await this.findImagesByProductId(id, tx);

    return product;
  }

  async findBySlug(
    slug: string,
    tx: MaybeTransaction = null,
  ): Promise<ProductAggregateRow | null> {
    const executor = tx ?? this.db;

    const query = `
      SELECT
        ${PRODUCT_WITH_RELATIONS}
      ${PRODUCT_JOINS}
      WHERE p.slug = $1
      LIMIT 1
    `;

    const result = await executor.query<ProductAggregateRow>(query, [slug]);

    const product = firstOrNull(result);

    if (!product) {
      return null;
    }

    product.images = await this.findImagesByProductId(product.id, tx);

    return product;
  }

  async findBySku(
    sku: string,
    tx: MaybeTransaction = null,
  ): Promise<ProductRow | null> {
    const query = `
      SELECT *
      FROM products
      WHERE sku = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<ProductRow>(query, [sku]);

    return firstOrNull(result);
  }

  async exists(
    { sku, slug, excludeId }: ProductExistsQuery = {},
    tx: MaybeTransaction = null,
  ): Promise<boolean> {
    const conditions: string[] = [];
    const params: unknown[] = [];

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

    const executor = tx ?? this.db;

    const result = await executor.query(query, params);

    return result.rows.length > 0;
  }

  async search(
    {
      name,
      sku,
      brandId,
      categoryId,
      status,
      page,
      limit,
      sortBy,
      sortDir,
    }: ProductSearchQuery,
    tx: MaybeTransaction = null,
  ): Promise<Page<ProductAggregateRow>> {
    const conditions: string[] = [];
    const params: unknown[] = [];

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

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const sortColumn = sortBy ? SORTABLE_COLUMNS[sortBy] : DEFAULT_SORT_COLUMN;
    const sortDirection = sortDir === "asc" ? "ASC" : "DESC";

    const offset = (page - 1) * limit;

    params.push(limit);
    const limitIndex = params.length;

    params.push(offset);
    const offsetIndex = params.length;

    const query = `
      SELECT
        ${PRODUCT_WITH_RELATIONS},
        COUNT(*) OVER() AS "totalCount"
      ${PRODUCT_JOINS}
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<ProductAggregateRow & WindowCounted>(
      query,
      params,
    );

    return toPage<ProductAggregateRow>(result);
  }

  async findImagesByProductId(
    productId: string,
    tx: MaybeTransaction = null,
  ): Promise<ProductImageRow[]> {
    const query = `
      SELECT *
      FROM product_images
      WHERE "productId" = $1
      ORDER BY position ASC
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<ProductImageRow>(query, [productId]);

    return result.rows;
  }

  async addImages(
    productId: string,
    images: ProductImageInput[],
    tx: MaybeTransaction = null,
  ): Promise<ProductImageRow[]> {
    const executor = tx ?? this.db;

    const maxPositionResult = await executor.query<{ maxPosition: number }>(
      `SELECT COALESCE(MAX(position), -1) AS "maxPosition" FROM product_images WHERE "productId" = $1`,
      [productId],
    );

    let nextPosition =
      Number(
        firstOrFail(maxPositionResult, "ProductRepository.addImages")
          .maxPosition,
      ) + 1;

    const inserted: ProductImageRow[] = [];

    for (const image of images) {
      const result = await executor.query<ProductImageRow>(
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

      inserted.push(firstOrFail(result, "ProductRepository.addImages"));

      nextPosition += 1;
    }

    return inserted;
  }

  async replaceImages(
    productId: string,
    images: ProductImageInput[],
    tx: MaybeTransaction = null,
  ): Promise<ProductImageRow[]> {
    const executor = tx ?? this.db;

    await executor.query(`DELETE FROM product_images WHERE "productId" = $1`, [
      productId,
    ]);

    const inserted: ProductImageRow[] = [];

    let position = 0;

    for (const image of images) {
      const result = await executor.query<ProductImageRow>(
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

      inserted.push(firstOrFail(result, "ProductRepository.replaceImages"));

      position += 1;
    }

    return inserted;
  }

  async removeImage(
    productId: string,
    imageId: string,
    tx: MaybeTransaction = null,
  ): Promise<ProductImageRow | null> {
    const query = `
      DELETE FROM product_images
      WHERE id = $1
      AND "productId" = $2
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<ProductImageRow>(query, [
      imageId,
      productId,
    ]);

    return firstOrNull(result);
  }
}
