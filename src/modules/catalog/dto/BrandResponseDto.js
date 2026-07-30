// src/modules/catalog/dto/BrandResponseDto.js

class BrandResponseDto {
  static fromEntity(brand) {
    if (!brand) {
      return null;
    }

    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo,
      description: brand.description,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }

  static fromList(brands) {
    return brands.map((brand) => BrandResponseDto.fromEntity(brand));
  }
}

module.exports = BrandResponseDto;
