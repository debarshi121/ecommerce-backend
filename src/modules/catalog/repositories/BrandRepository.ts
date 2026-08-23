// src/modules/catalog/repositories/BrandRepository.ts

import type { MaybeTransaction, QueryExecutor } from "../../../shared/types/database";
import type { BrandRow } from "../../../shared/types/entities";
import { firstOrFail, firstOrNull } from "../../../shared/utils/rows";
import {
  buildUpdateAssignments,
  type ColumnMap,
} from "../../../shared/utils/sqlUpdate";
import type {
  CreateBrandInput,
  IBrandRepository,
  UpdateBrandPatch,
} from "../contracts";

const COLUMN_MAP: ColumnMap<UpdateBrandPatch> = {
  name: "name",
  slug: "slug",
  logo: "logo",
  description: "description",
};

export class BrandRepository implements IBrandRepository {
  private readonly db: QueryExecutor;

  constructor(postgresClient: QueryExecutor) {
    this.db = postgresClient;
  }

  async create(
    brand: CreateBrandInput,
    tx: MaybeTransaction = null,
  ): Promise<BrandRow> {
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

    const executor = tx ?? this.db;

    const result = await executor.query<BrandRow>(query, [
      brand.name,
      brand.slug,
      brand.logo || null,
      brand.description || null,
    ]);

    return firstOrFail(result, "BrandRepository.create");
  }

  async update(
    id: string,
    fields: UpdateBrandPatch,
    tx: MaybeTransaction = null,
  ): Promise<BrandRow | null> {
    const { assignments, values } = buildUpdateAssignments(fields, COLUMN_MAP);

    if (assignments.length === 0) {
      return this.findById(id, tx);
    }

    const query = `
      UPDATE brands
      SET ${assignments.join(", ")}, "updatedAt" = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<BrandRow>(query, [id, ...values]);

    return firstOrNull(result);
  }

  async delete(id: string, tx: MaybeTransaction = null): Promise<void> {
    const query = `
      DELETE FROM brands
      WHERE id = $1
    `;

    const executor = tx ?? this.db;

    await executor.query(query, [id]);
  }

  async findAll(tx: MaybeTransaction = null): Promise<BrandRow[]> {
    const query = `
      SELECT *
      FROM brands
      ORDER BY name ASC
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<BrandRow>(query);

    return result.rows;
  }

  async findById(
    id: string,
    tx: MaybeTransaction = null,
  ): Promise<BrandRow | null> {
    const query = `
      SELECT *
      FROM brands
      WHERE id = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<BrandRow>(query, [id]);

    return firstOrNull(result);
  }

  async findBySlug(
    slug: string,
    tx: MaybeTransaction = null,
  ): Promise<BrandRow | null> {
    const query = `
      SELECT *
      FROM brands
      WHERE slug = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<BrandRow>(query, [slug]);

    return firstOrNull(result);
  }

  async findByName(
    name: string,
    tx: MaybeTransaction = null,
  ): Promise<BrandRow | null> {
    const query = `
      SELECT *
      FROM brands
      WHERE name = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<BrandRow>(query, [name]);

    return firstOrNull(result);
  }

  async countProducts(
    brandId: string,
    tx: MaybeTransaction = null,
  ): Promise<number> {
    const query = `
      SELECT COUNT(*)::int AS count
      FROM products
      WHERE "brandId" = $1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<{ count: number }>(query, [brandId]);

    return firstOrFail(result, "BrandRepository.countProducts").count;
  }
}
