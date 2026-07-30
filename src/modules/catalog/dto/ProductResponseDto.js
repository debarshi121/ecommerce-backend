// src/modules/catalog/dto/ProductResponseDto.js

class ProductResponseDto {
  static fromEntity(product) {
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

  static fromList(products) {
    return products.map((product) => ProductResponseDto.fromEntity(product));
  }
}

module.exports = ProductResponseDto;
