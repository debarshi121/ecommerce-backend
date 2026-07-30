// src/modules/catalog/services/ProductService.js

const slugify = require("../../../shared/utils/slugify");

const NotFoundError = require("../../../shared/errors/NotFoundError");
const ConflictError = require("../../../shared/errors/ConflictError");

const ProductStatus = require("../constants/ProductStatus");

const ProductCreated = require("../events/ProductCreated");
const ProductUpdated = require("../events/ProductUpdated");
const ProductArchived = require("../events/ProductArchived");

class ProductService {
  constructor({
    productRepository,
    categoryRepository,
    brandRepository,
    outboxService,
    transactionManager,
  }) {
    this.productRepository = productRepository;
    this.categoryRepository = categoryRepository;
    this.brandRepository = brandRepository;
    this.outboxService = outboxService;
    this.transactionManager = transactionManager;
  }

  async _generateUniqueSlug(name) {
    const base = slugify(name);

    let candidate = base;
    let suffix = 1;

    while (await this.productRepository.exists({ slug: candidate })) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }

    return candidate;
  }

  async _assertCategoryExists(categoryId) {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw new NotFoundError("Category not found");
    }
  }

  async _assertBrandExists(brandId) {
    const brand = await this.brandRepository.findById(brandId);

    if (!brand) {
      throw new NotFoundError("Brand not found");
    }
  }

  async _requireEditableProduct(productId) {
    const product = await this.productRepository.findRawById(productId);

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    if (product.status === ProductStatus.ARCHIVED) {
      throw new ConflictError("Cannot modify an archived product");
    }

    return product;
  }

  async createProduct(data) {
    const skuTaken = await this.productRepository.exists({ sku: data.sku });

    if (skuTaken) {
      throw new ConflictError(`SKU '${data.sku}' already exists`);
    }

    if (data.categoryId) {
      await this._assertCategoryExists(data.categoryId);
    }

    if (data.brandId) {
      await this._assertBrandExists(data.brandId);
    }

    const slug = await this._generateUniqueSlug(data.name);

    const created = await this.transactionManager.execute(async (tx) => {
      const product = await this.productRepository.create(
        {
          sku: data.sku,
          slug,
          name: data.name,
          shortDescription: data.shortDescription,
          description: data.description,
          categoryId: data.categoryId,
          brandId: data.brandId,
          status: ProductStatus.DRAFT,
          metadata: data.metadata,
        },
        tx,
      );

      if (data.images && data.images.length > 0) {
        await this.productRepository.addImages(product.id, data.images, tx);
      }

      await this.outboxService.addEvent(ProductCreated.build(product), tx);

      return product;
    });

    return this.productRepository.findById(created.id);
  }

  async updateProduct(id, patch) {
    await this._requireEditableProduct(id);

    if (Object.keys(patch).length === 0) {
      return this.productRepository.findById(id);
    }

    await this.transactionManager.execute(async (tx) => {
      const updated = await this.productRepository.update(id, patch, tx);

      await this.outboxService.addEvent(
        ProductUpdated.build(updated, Object.keys(patch)),
        tx,
      );
    });

    return this.productRepository.findById(id);
  }

  async changeCategory(productId, categoryId) {
    await this._requireEditableProduct(productId);

    if (categoryId) {
      await this._assertCategoryExists(categoryId);
    }

    await this.transactionManager.execute(async (tx) => {
      const updated = await this.productRepository.update(
        productId,
        { categoryId },
        tx,
      );

      await this.outboxService.addEvent(
        ProductUpdated.build(updated, ["categoryId"]),
        tx,
      );
    });

    return this.productRepository.findById(productId);
  }

  async changeBrand(productId, brandId) {
    await this._requireEditableProduct(productId);

    if (brandId) {
      await this._assertBrandExists(brandId);
    }

    await this.transactionManager.execute(async (tx) => {
      const updated = await this.productRepository.update(productId, { brandId }, tx);

      await this.outboxService.addEvent(
        ProductUpdated.build(updated, ["brandId"]),
        tx,
      );
    });

    return this.productRepository.findById(productId);
  }

  async _transitionStatus(id, targetStatus) {
    const product = await this.productRepository.findRawById(id);

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    const allowedTargets = ProductStatus.ALLOWED_TRANSITIONS[product.status] || [];

    if (!allowedTargets.includes(targetStatus)) {
      throw new ConflictError(
        `Cannot transition product from ${product.status} to ${targetStatus}`,
      );
    }

    await this.transactionManager.execute(async (tx) => {
      const updated = await this.productRepository.update(
        id,
        { status: targetStatus },
        tx,
      );

      await this.outboxService.addEvent(
        ProductUpdated.build(updated, ["status"]),
        tx,
      );
    });

    return this.productRepository.findById(id);
  }

  async activateProduct(id) {
    return this._transitionStatus(id, ProductStatus.ACTIVE);
  }

  async deactivateProduct(id) {
    return this._transitionStatus(id, ProductStatus.INACTIVE);
  }

  async archiveProduct(id) {
    const product = await this.productRepository.findRawById(id);

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    const allowedTargets = ProductStatus.ALLOWED_TRANSITIONS[product.status] || [];

    if (!allowedTargets.includes(ProductStatus.ARCHIVED)) {
      throw new ConflictError(
        `Cannot transition product from ${product.status} to ARCHIVED`,
      );
    }

    const archived = await this.transactionManager.execute(async (tx) => {
      const result = await this.productRepository.archive(id, tx);

      await this.outboxService.addEvent(ProductArchived.build(result), tx);

      return result;
    });

    return this.productRepository.findById(archived.id);
  }

  async addImages(productId, images) {
    await this._requireEditableProduct(productId);

    await this.transactionManager.execute((tx) =>
      this.productRepository.addImages(productId, images, tx),
    );

    return this.productRepository.findById(productId);
  }

  async replaceImages(productId, images) {
    await this._requireEditableProduct(productId);

    await this.transactionManager.execute((tx) =>
      this.productRepository.replaceImages(productId, images, tx),
    );

    return this.productRepository.findById(productId);
  }

  async removeImage(productId, imageId) {
    const product = await this.productRepository.findRawById(productId);

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    const removed = await this.productRepository.removeImage(productId, imageId);

    if (!removed) {
      throw new NotFoundError("Image not found on this product");
    }

    return this.productRepository.findById(productId);
  }

  async getProduct(id) {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    return product;
  }

  async getProductBySlug(slug) {
    const product = await this.productRepository.findBySlug(slug);

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    return product;
  }

  async searchProducts(filters) {
    const { items, total } = await this.productRepository.search(filters);

    return {
      items,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      },
    };
  }
}

module.exports = ProductService;
