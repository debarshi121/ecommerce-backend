// src/modules/catalog/dto/CreateProductDto.js

class CreateProductDto {
  static fromRequest(body) {
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
            position: Number.isInteger(image.position) ? image.position : null,
          }))
        : [],
    };
  }
}

module.exports = CreateProductDto;
