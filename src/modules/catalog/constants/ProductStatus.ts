// src/modules/catalog/constants/ProductStatus.ts
//
// Mirrors chk_products_status in migration 005.

export const ProductStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;

export type ProductStatusValue =
  (typeof ProductStatus)[keyof typeof ProductStatus];

/**
 * The product lifecycle as data rather than as branching: any transition not
 * listed here is rejected by ProductService. ARCHIVED is terminal.
 *
 * `Record<ProductStatusValue, ...>` is what makes this exhaustive — adding a
 * status to the union without giving it a row is a compile error.
 */
export const PRODUCT_STATUS_TRANSITIONS: Record<
  ProductStatusValue,
  readonly ProductStatusValue[]
> = {
  DRAFT: [ProductStatus.ACTIVE, ProductStatus.ARCHIVED],
  ACTIVE: [ProductStatus.INACTIVE, ProductStatus.ARCHIVED],
  INACTIVE: [ProductStatus.ACTIVE, ProductStatus.ARCHIVED],
  ARCHIVED: [],
};

export function canTransition(
  from: ProductStatusValue,
  to: ProductStatusValue,
): boolean {
  return PRODUCT_STATUS_TRANSITIONS[from].includes(to);
}
