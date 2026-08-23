// src/modules/catalog/repositories/CategoryRepository.ts

import type { MaybeTransaction, QueryExecutor } from "../../../shared/types/database";
import type { CategoryRow } from "../../../shared/types/entities";
import { firstOrFail, firstOrNull } from "../../../shared/utils/rows";
import {
  buildUpdateAssignments,
  type ColumnMap,
} from "../../../shared/utils/sqlUpdate";
import type {
  CreateCategoryInput,
  ICategoryRepository,
  UpdateCategoryPatch,
} from "../contracts";

const COLUMN_MAP: ColumnMap<UpdateCategoryPatch> = {
  name: "name",
  slug: "slug",
  parentId: '"parentId"',
  description: "description",
};

export class CategoryRepository implements ICategoryRepository {
  private readonly db: QueryExecutor;

  constructor(postgresClient: QueryExecutor) {
    this.db = postgresClient;
  }

  async create(
    category: CreateCategoryInput,
    tx: MaybeTransaction = null,
  ): Promise<CategoryRow> {
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

    const executor = tx ?? this.db;

    const result = await executor.query<CategoryRow>(query, [
      category.parentId || null,
      category.name,
      category.slug,
      category.description || null,
    ]);

    return firstOrFail(result, "CategoryRepository.create");
  }

  async update(
    id: string,
    fields: UpdateCategoryPatch,
    tx: MaybeTransaction = null,
  ): Promise<CategoryRow | null> {
    const { assignments, values } = buildUpdateAssignments(fields, COLUMN_MAP);

    if (assignments.length === 0) {
      return this.findById(id, tx);
    }

    const query = `
      UPDATE categories
      SET ${assignments.join(", ")}, "updatedAt" = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<CategoryRow>(query, [id, ...values]);

    return firstOrNull(result);
  }

  async delete(id: string, tx: MaybeTransaction = null): Promise<void> {
    const query = `
      DELETE FROM categories
      WHERE id = $1
    `;

    const executor = tx ?? this.db;

    await executor.query(query, [id]);
  }

  async findById(
    id: string,
    tx: MaybeTransaction = null,
  ): Promise<CategoryRow | null> {
    const query = `
      SELECT *
      FROM categories
      WHERE id = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<CategoryRow>(query, [id]);

    return firstOrNull(result);
  }

  async findBySlug(
    slug: string,
    tx: MaybeTransaction = null,
  ): Promise<CategoryRow | null> {
    const query = `
      SELECT *
      FROM categories
      WHERE slug = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<CategoryRow>(query, [slug]);

    return firstOrNull(result);
  }

  async children(
    parentId: string | null,
    tx: MaybeTransaction = null,
  ): Promise<CategoryRow[]> {
    const executor = tx ?? this.db;

    if (!parentId) {
      const result = await executor.query<CategoryRow>(
        `SELECT * FROM categories WHERE "parentId" IS NULL ORDER BY name ASC`,
      );

      return result.rows;
    }

    const result = await executor.query<CategoryRow>(
      `SELECT * FROM categories WHERE "parentId" = $1 ORDER BY name ASC`,
      [parentId],
    );

    return result.rows;
  }

  async countProducts(
    categoryId: string,
    tx: MaybeTransaction = null,
  ): Promise<number> {
    const query = `
      SELECT COUNT(*)::int AS count
      FROM products
      WHERE "categoryId" = $1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<{ count: number }>(query, [categoryId]);

    return firstOrFail(result, "CategoryRepository.countProducts").count;
  }

  async tree(tx: MaybeTransaction = null): Promise<CategoryRow[]> {
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

    const executor = tx ?? this.db;

    const result = await executor.query<CategoryRow>(query);

    return result.rows;
  }
}
