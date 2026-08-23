// src/modules/catalog/services/CategoryService.ts

import { ConflictError } from "../../../shared/errors/ConflictError";
import { NotFoundError } from "../../../shared/errors/NotFoundError";
import type {
  CategoryRow,
  CategoryTreeNode,
} from "../../../shared/types/entities";
import { slugify } from "../../../shared/utils/slugify";
import type {
  CreateCategoryCommand,
  ICategoryRepository,
  UpdateCategoryPatch,
} from "../contracts";

export interface CategoryServiceDependencies {
  categoryRepository: ICategoryRepository;
}

export class CategoryService {
  private readonly categoryRepository: ICategoryRepository;

  constructor({ categoryRepository }: CategoryServiceDependencies) {
    this.categoryRepository = categoryRepository;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);

    let candidate = base;
    let suffix = 1;

    while (await this.categoryRepository.findBySlug(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }

    return candidate;
  }

  private async requireCategory(id: string): Promise<CategoryRow> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundError("Category not found");
    }

    return category;
  }

  /**
   * Walks up from the proposed parent to the root. Reaching the category
   * being moved would mean moving it under its own descendant, which would
   * detach that whole subtree from the root.
   */
  private async assertNoCycle(
    categoryId: string,
    newParentId: string,
  ): Promise<void> {
    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === categoryId) {
        throw new ConflictError(
          "Cannot move a category under its own descendant",
        );
      }

      if (visited.has(currentId)) {
        break;
      }

      visited.add(currentId);

      const parent = await this.categoryRepository.findById(currentId);

      currentId = parent ? parent.parentId : null;
    }
  }

  /** Nests the flat recursive-CTE result into a root-first tree. */
  private buildTree(rows: CategoryRow[]): CategoryTreeNode[] {
    const byId = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    rows.forEach((row) => {
      byId.set(row.id, { ...row, children: [] });
    });

    byId.forEach((node) => {
      const parent = node.parentId ? byId.get(node.parentId) : undefined;

      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async createCategory(data: CreateCategoryCommand): Promise<CategoryRow> {
    if (data.parentId) {
      const parent = await this.categoryRepository.findById(data.parentId);

      if (!parent) {
        throw new NotFoundError("Parent category not found");
      }
    }

    const slug = await this.generateUniqueSlug(data.name);

    return this.categoryRepository.create({
      name: data.name,
      parentId: data.parentId || null,
      description: data.description || null,
      slug,
    });
  }

  async updateCategory(
    id: string,
    patch: UpdateCategoryPatch,
  ): Promise<CategoryRow | null> {
    await this.requireCategory(id);

    if (patch.parentId !== undefined && patch.parentId !== null) {
      if (patch.parentId === id) {
        throw new ConflictError("A category cannot be its own parent");
      }

      const parent = await this.categoryRepository.findById(patch.parentId);

      if (!parent) {
        throw new NotFoundError("Parent category not found");
      }

      await this.assertNoCycle(id, patch.parentId);
    }

    return this.categoryRepository.update(id, patch);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.requireCategory(id);

    const children = await this.categoryRepository.children(id);

    if (children.length > 0) {
      throw new ConflictError("Cannot delete a category that has subcategories");
    }

    const productCount = await this.categoryRepository.countProducts(id);

    if (productCount > 0) {
      throw new ConflictError(
        "Cannot delete a category that has products assigned",
      );
    }

    await this.categoryRepository.delete(id);
  }

  async getCategory(id: string): Promise<CategoryRow> {
    return this.requireCategory(id);
  }

  async getChildren(parentId: string | null): Promise<CategoryRow[]> {
    return this.categoryRepository.children(parentId || null);
  }

  async getTree(): Promise<CategoryTreeNode[]> {
    const rows = await this.categoryRepository.tree();

    return this.buildTree(rows);
  }
}
