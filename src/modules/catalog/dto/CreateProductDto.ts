// src/modules/catalog/dto/CreateProductDto.ts

import type { CreateProductCommand } from "../contracts";
import type { CreateProductInput as CreateProductRequest } from "../validators/CreateProductValidator";

/**
 * Normalises a validated create-product request into the command the service
 * consumes: trimming, defaulting absent optionals to null/empty, and
 * flattening the image list.
 */
export class CreateProductDto {
  static fromRequest(body: CreateProductRequest["body"]): CreateProductCommand {
    return {
      sku: body.sku.trim(),

      name: body.name.trim(),

      shortDescription: body.shortDescription
        ? body.shortDescription.trim()
        : null,

      description: body.description ? body.description.trim() : null,

      categoryId: body.categoryId || null,

      brandId: body.brandId || null,

      metadata: body.metadata || {},

      images: Array.isArray(body.images)
        ? body.images.map((image) => ({
            imageUrl: image.imageUrl.trim(),
            altText: image.altText ? image.altText.trim() : null,
            position: Number.isInteger(image.position)
              ? (image.position as number)
              : null,
          }))
        : [],
    };
  }
}
