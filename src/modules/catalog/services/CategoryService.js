// src/modules/catalog/services/CategoryService.js

const slugify = require("../../../shared/utils/slugify");

const NotFoundError = require("../../../shared/errors/NotFoundError");
const ConflictError = require("../../../shared/errors/ConflictError");

class CategoryService {
  constructor({ categoryRepository }) {
    this.categoryRepository = categoryRepository;
  }

  async _generateUniqueSlug(name) {
    const base = slugify(name);

    let candidate = base;
    let suffix = 1;

    while (await this.categoryRepository.findBySlug(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }

    return candidate;
  }

  async _assertNoCycle(categoryId, newParentId) {
    let currentId = newParentId;
    const visited = new Set();

    while (currentId) {
      if (currentId === categoryId) {
        throw new ConflictError("Cannot move a category under its own descendant");
      }

      if (visited.has(currentId)) {
        break;
      }

      visited.add(currentId);

      const parent = await this.categoryRepository.findById(currentId);

      currentId = parent ? parent.parentId : null;
    }
  }

  _buildTree(rows) {
    const byId = new Map();
    const roots = [];

    rows.forEach((row) => {
      byId.set(row.id, { ...row, children: [] });
    });

    byId.forEach((node) => {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async createCategory(data) {
    if (data.parentId) {
      const parent = await this.categoryRepository.findById(data.parentId);

      if (!parent) {
        throw new NotFoundError("Parent category not found");
      }
    }

    const slug = await this._generateUniqueSlug(data.name);

    return this.categoryRepository.create({
      name: data.name,
      parentId: data.parentId || null,
      description: data.description || null,
      slug,
    });
  }

  async updateCategory(id, patch) {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundError("Category not found");
    }

    if (patch.parentId !== undefined && patch.parentId !== null) {
      if (patch.parentId === id) {
        throw new ConflictError("A category cannot be its own parent");
      }

      const parent = await this.categoryRepository.findById(patch.parentId);

      if (!parent) {
        throw new NotFoundError("Parent category not found");
      }

      await this._assertNoCycle(id, patch.parentId);
    }

    return this.categoryRepository.update(id, patch);
  }

  async deleteCategory(id) {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundError("Category not found");
    }

    const children = await this.categoryRepository.children(id);

    if (children.length > 0) {
      throw new ConflictError("Cannot delete a category that has subcategories");
    }

    const productCount = await this.categoryRepository.countProducts(id);

    if (productCount > 0) {
      throw new ConflictError("Cannot delete a category that has products assigned");
    }

    await this.categoryRepository.delete(id);
  }

  async getCategory(id) {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundError("Category not found");
    }

    return category;
  }

  async getChildren(parentId) {
    return this.categoryRepository.children(parentId || null);
  }

  async getTree() {
    const rows = await this.categoryRepository.tree();

    return this._buildTree(rows);
  }
}

module.exports = CategoryService;
