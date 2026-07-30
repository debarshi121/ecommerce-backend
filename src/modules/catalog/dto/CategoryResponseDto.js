// src/modules/catalog/dto/CategoryResponseDto.js

class CategoryResponseDto {
  static fromEntity(category) {
    if (!category) {
      return null;
    }

    return {
      id: category.id,
      parentId: category.parentId,
      name: category.name,
      slug: category.slug,
      description: category.description,
      children: Array.isArray(category.children)
        ? category.children.map((child) => CategoryResponseDto.fromEntity(child))
        : undefined,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  static fromList(categories) {
    return categories.map((category) => CategoryResponseDto.fromEntity(category));
  }
}

module.exports = CategoryResponseDto;
