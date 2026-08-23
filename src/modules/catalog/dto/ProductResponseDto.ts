// src/modules/catalog/dto/ProductResponseDto.ts

import type {
  JsonObject,
  ProductAggregateRow,
  ProductRelationSummary,
} from "../../../shared/types/entities";
import type { ProductStatusValue } from "../constants/ProductStatus";

export interface ProductImageResponse {
  id: string;
  imageUrl: string;
  altText: string | null;
  position: number;
}

export interface ProductResponse {
  id: string;
  sku: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  status: ProductStatusValue;
  metadata: JsonObject;
  category: ProductRelationSummary | null;
  brand: ProductRelationSummary | null;
  images: ProductImageResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export class ProductResponseDto {
  static fromEntity(
    product: ProductAggregateRow | null,
  ): ProductResponse | null {
    if (!product) {
      return null;
    }

    return {
      id: product.id,
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      status: product.status,
      metadata: product.metadata,

      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,

      brand: product.brand
        ? {
            id: product.brand.id,
            name: product.brand.name,
            slug: product.brand.slug,
          }
        : null,

      images: Array.isArray(product.images)
        ? product.images
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((image) => ({
              id: image.id,
              imageUrl: image.imageUrl,
              altText: image.altText,
              position: image.position,
            }))
        : [],

      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  static fromList(
    products: ProductAggregateRow[],
  ): (ProductResponse | null)[] {
    return products.map((product) => ProductResponseDto.fromEntity(product));
  }
}
