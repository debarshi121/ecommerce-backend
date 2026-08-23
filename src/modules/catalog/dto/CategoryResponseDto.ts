// src/modules/catalog/dto/CategoryResponseDto.ts

import type {
  CategoryRow,
  CategoryTreeNode,
} from "../../../shared/types/entities";

export interface CategoryResponse {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  /** Present only when the source row carried a nested subtree. */
  children?: (CategoryResponse | null)[];
  createdAt: Date;
  updatedAt: Date;
}

type CategorySource = CategoryRow | CategoryTreeNode;

function hasChildren(
  category: CategorySource,
): category is CategoryTreeNode {
  return Array.isArray((category as CategoryTreeNode).children);
}

export class CategoryResponseDto {
  static fromEntity(
    category: CategorySource | null,
  ): CategoryResponse | null {
    if (!category) {
      return null;
    }

    return {
      id: category.id,
      parentId: category.parentId,
      name: category.name,
      slug: category.slug,
      description: category.description,
      children: hasChildren(category)
        ? category.children.map((child) =>
            CategoryResponseDto.fromEntity(child),
          )
        : undefined,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  static fromList(
    categories: CategorySource[],
  ): (CategoryResponse | null)[] {
    return categories.map((category) =>
      CategoryResponseDto.fromEntity(category),
    );
  }
}
