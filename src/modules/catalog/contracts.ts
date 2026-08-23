// src/modules/catalog/contracts.ts

import type { MaybeTransaction } from "../../shared/types/database";
import type {
  BrandRow,
  CategoryRow,
  CategoryTreeNode,
  JsonObject,
  ProductAggregateRow,
  ProductImageRow,
  ProductRow,
} from "../../shared/types/entities";
import type { Page, SortDirection } from "../../shared/types/pagination";
import type { ProductStatusValue } from "./constants/ProductStatus";

/*
|--------------------------------------------------------------------------
| Write models
|--------------------------------------------------------------------------
*/

export interface ProductImageInput {
  imageUrl: string;
  altText?: string | null;
  position?: number | null;
}

export interface CreateProductInput {
  sku: string;
  slug: string;
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  status: ProductStatusValue;
  metadata?: JsonObject;
}

/**
 * Partial product update. Only the keys present are written, which is what
 * lets `ProductUpdated` report exactly which fields changed.
 */
export interface UpdateProductPatch {
  name?: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  status?: ProductStatusValue;
  metadata?: JsonObject;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string | null;
}

export interface UpdateCategoryPatch {
  name?: string;
  slug?: string;
  parentId?: string | null;
  description?: string | null;
}

export interface CreateBrandInput {
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
}

export interface UpdateBrandPatch {
  name?: string;
  slug?: string;
  logo?: string | null;
  description?: string | null;
}

/*
|--------------------------------------------------------------------------
| Queries
|--------------------------------------------------------------------------
*/

export type ProductSortField =
  | "name"
  | "sku"
  | "status"
  | "createdAt"
  | "updatedAt";

export interface ProductSearchQuery {
  name?: string;
  sku?: string;
  brandId?: string;
  categoryId?: string;
  status?: ProductStatusValue;
  page: number;
  limit: number;
  sortBy?: ProductSortField;
  sortDir?: SortDirection;
}

/** Uniqueness probe: "is this sku or slug taken by anyone but `excludeId`?" */
export interface ProductExistsQuery {
  sku?: string;
  slug?: string;
  excludeId?: string;
}

/*
|--------------------------------------------------------------------------
| Repository ports
|--------------------------------------------------------------------------
*/

export interface IProductRepository {
  create(
    product: CreateProductInput,
    tx?: MaybeTransaction,
  ): Promise<ProductRow>;
  update(
    id: string,
    fields: UpdateProductPatch,
    tx?: MaybeTransaction,
  ): Promise<ProductRow | null>;
  archive(id: string, tx?: MaybeTransaction): Promise<ProductRow | null>;
  /** Product columns only — no joins, no images. */
  findRawById(id: string, tx?: MaybeTransaction): Promise<ProductRow | null>;
  findById(
    id: string,
    tx?: MaybeTransaction,
  ): Promise<ProductAggregateRow | null>;
  findBySlug(
    slug: string,
    tx?: MaybeTransaction,
  ): Promise<ProductAggregateRow | null>;
  findBySku(sku: string, tx?: MaybeTransaction): Promise<ProductRow | null>;
  exists(query: ProductExistsQuery, tx?: MaybeTransaction): Promise<boolean>;
  search(
    query: ProductSearchQuery,
    tx?: MaybeTransaction,
  ): Promise<Page<ProductAggregateRow>>;
  findImagesByProductId(
    productId: string,
    tx?: MaybeTransaction,
  ): Promise<ProductImageRow[]>;
  addImages(
    productId: string,
    images: ProductImageInput[],
    tx?: MaybeTransaction,
  ): Promise<ProductImageRow[]>;
  replaceImages(
    productId: string,
    images: ProductImageInput[],
    tx?: MaybeTransaction,
  ): Promise<ProductImageRow[]>;
  removeImage(
    productId: string,
    imageId: string,
    tx?: MaybeTransaction,
  ): Promise<ProductImageRow | null>;
}

export interface ICategoryRepository {
  create(
    category: CreateCategoryInput,
    tx?: MaybeTransaction,
  ): Promise<CategoryRow>;
  update(
    id: string,
    fields: UpdateCategoryPatch,
    tx?: MaybeTransaction,
  ): Promise<CategoryRow | null>;
  delete(id: string, tx?: MaybeTransaction): Promise<void>;
  findById(id: string, tx?: MaybeTransaction): Promise<CategoryRow | null>;
  findBySlug(slug: string, tx?: MaybeTransaction): Promise<CategoryRow | null>;
  children(
    parentId: string | null,
    tx?: MaybeTransaction,
  ): Promise<CategoryRow[]>;
  countProducts(categoryId: string, tx?: MaybeTransaction): Promise<number>;
  /** Whole subtree, flat, via a recursive CTE. */
  tree(tx?: MaybeTransaction): Promise<CategoryRow[]>;
}

export interface IBrandRepository {
  create(brand: CreateBrandInput, tx?: MaybeTransaction): Promise<BrandRow>;
  update(
    id: string,
    fields: UpdateBrandPatch,
    tx?: MaybeTransaction,
  ): Promise<BrandRow | null>;
  delete(id: string, tx?: MaybeTransaction): Promise<void>;
  findAll(tx?: MaybeTransaction): Promise<BrandRow[]>;
  findById(id: string, tx?: MaybeTransaction): Promise<BrandRow | null>;
  findBySlug(slug: string, tx?: MaybeTransaction): Promise<BrandRow | null>;
  findByName(name: string, tx?: MaybeTransaction): Promise<BrandRow | null>;
  countProducts(brandId: string, tx?: MaybeTransaction): Promise<number>;
}

/*
|--------------------------------------------------------------------------
| Service-level shapes
|--------------------------------------------------------------------------
*/

/** What `ProductController` hands `ProductService.createProduct`. */
export interface CreateProductCommand {
  sku: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  categoryId: string | null;
  brandId: string | null;
  metadata: JsonObject;
  images: ProductImageInput[];
}

export interface CreateCategoryCommand {
  name: string;
  parentId?: string | null;
  description?: string | null;
}

export interface CreateBrandCommand {
  name: string;
  logo?: string | null;
  description?: string | null;
}

export type CategoryTree = CategoryTreeNode[];

/*
|--------------------------------------------------------------------------
| Integration event payloads published by this module
|--------------------------------------------------------------------------
*/

export interface ProductCreatedPayload {
  productId: string;
  sku: string;
  slug: string;
  name: string;
  categoryId: string | null;
  brandId: string | null;
  status: ProductStatusValue;
}

export interface ProductUpdatedPayload extends ProductCreatedPayload {
  changedFields: string[];
}

export interface ProductArchivedPayload {
  productId: string;
  sku: string;
  slug: string;
}
