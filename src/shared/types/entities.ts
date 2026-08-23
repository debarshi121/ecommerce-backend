// src/shared/types/entities.ts
//
// One interface per database table, named `<Table>Row`, mirroring exactly
// what `pg` hands back (UUID -> string, TIMESTAMP -> Date, JSONB -> object,
// INTEGER -> number, BIGINT -> string). Rows are the persistence-layer
// shape: they cross the repository -> service boundary, and are mapped to
// response DTOs before they cross the HTTP boundary.

import type { InboxStatusValue } from "../constants/InboxStatus";
import type { ProductStatusValue } from "../../modules/catalog/constants/ProductStatus";
import type { ReservationStatusValue } from "../../modules/inventory/constants/ReservationStatus";
import type { StockMovementTypeValue } from "../../modules/inventory/constants/StockMovementType";

/** Arbitrary JSON stored in a JSONB column. */
export type JsonObject = Record<string, unknown>;

/**
 * `COUNT(*) OVER()` is a bigint, which node-postgres returns as a string to
 * avoid precision loss — hence the `string`, and the `Number(...)` at every
 * call site.
 */
export interface WindowCounted {
  totalCount: string;
}

/*
|--------------------------------------------------------------------------
| Identity
|--------------------------------------------------------------------------
*/

export interface RoleRow {
  id: string;
  name: string;
  createdAt: Date;
}

export interface PermissionRow {
  id: string;
  name: string;
  createdAt: Date;
}

/** Just the name column, as returned by the permission lookup joins. */
export interface PermissionNameRow {
  name: string;
}

export interface RolePermissionRow {
  id: string;
  name: string;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  roleId: string | null;
  isActive: boolean;
  tokenVersion: number;
  createdAt: Date;
}

/**
 * Projection returned by `UserRepository.findByEmail` — the base user
 * columns plus the joined role name. `passwordHash` is present here because
 * password authentication needs it.
 */
export interface UserWithRoleRow {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  roleId: string | null;
  isActive: boolean;
  tokenVersion: number;
  role: string | null;
}

/**
 * Same projection as `UserWithRoleRow` minus the credential hash — what
 * `findById` selects, so a hash can never leak into a response by accident.
 */
export type SafeUserWithRoleRow = Omit<UserWithRoleRow, "passwordHash">;

export interface SessionRow {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceName: string | null;
  expiresAt: Date;
  createdAt: Date;
}

/*
|--------------------------------------------------------------------------
| Messaging (outbox / inbox)
|--------------------------------------------------------------------------
*/

export interface OutboxEventRow {
  id: string;
  eventName: string;
  module: string;
  routingKey: string;
  payload: JsonObject;
  processed: boolean;
  createdAt: Date;
}

export interface InboxEventRow {
  id: string;
  eventId: string;
  eventName: string;
  module: string;
  queue: string;
  payload: JsonObject;
  status: InboxStatusValue;
  lastError: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/*
|--------------------------------------------------------------------------
| Catalog
|--------------------------------------------------------------------------
*/

export interface CategoryRow {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A `CategoryRow` after `CategoryService` nests it into a tree. */
export interface CategoryTreeNode extends CategoryRow {
  children: CategoryTreeNode[];
}

export interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductRow {
  id: string;
  sku: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  categoryId: string | null;
  brandId: string | null;
  status: ProductStatusValue;
  metadata: JsonObject;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImageRow {
  id: string;
  productId: string;
  imageUrl: string;
  altText: string | null;
  position: number;
  createdAt: Date;
}

/** Denormalised category/brand summary embedded by the product joins. */
export interface ProductRelationSummary {
  id: string;
  name: string;
  slug: string;
}

/**
 * `ProductRow` plus its joined relations. `images` is only populated by the
 * single-product finders (`findById` / `findBySlug`); list queries leave it
 * undefined rather than firing one extra query per row.
 */
export interface ProductAggregateRow extends ProductRow {
  category: ProductRelationSummary | null;
  brand: ProductRelationSummary | null;
  images?: ProductImageRow[];
}

/*
|--------------------------------------------------------------------------
| Inventory
|--------------------------------------------------------------------------
*/

export interface InventoryRow {
  id: string;
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationRow {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  status: ReservationStatusValue;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovementRow {
  id: string;
  productId: string;
  movementType: StockMovementTypeValue;
  quantity: number;
  referenceId: string | null;
  reason: string | null;
  createdAt: Date;
}
