// src/modules/catalog/services/ProductService.ts

import type { IOutboxService } from "../../../shared/contracts";
import { ConflictError } from "../../../shared/errors/ConflictError";
import { InternalServerError } from "../../../shared/errors/InternalServerError";
import { NotFoundError } from "../../../shared/errors/NotFoundError";
import type { ITransactionManager } from "../../../shared/types/database";
import type {
  ProductAggregateRow,
  ProductRow,
} from "../../../shared/types/entities";
import type { PaginatedResponse } from "../../../shared/types/pagination";
import { buildPaginationMeta } from "../../../shared/types/pagination";
import { slugify } from "../../../shared/utils/slugify";

import {
  canTransition,
  ProductStatus,
  type ProductStatusValue,
} from "../constants/ProductStatus";
import type {
  CreateProductCommand,
  IBrandRepository,
  ICategoryRepository,
  IProductRepository,
  ProductImageInput,
  ProductSearchQuery,
  UpdateProductPatch,
} from "../contracts";
import { ProductArchived } from "../events/ProductArchived";
import { ProductCreated } from "../events/ProductCreated";
import { ProductUpdated } from "../events/ProductUpdated";

export interface ProductServiceDependencies {
  productRepository: IProductRepository;
  categoryRepository: ICategoryRepository;
  brandRepository: IBrandRepository;
  outboxService: IOutboxService;
  transactionManager: ITransactionManager;
}

export class ProductService {
  private readonly productRepository: IProductRepository;

  private readonly categoryRepository: ICategoryRepository;

  private readonly brandRepository: IBrandRepository;

  private readonly outboxService: IOutboxService;

  private readonly transactionManager: ITransactionManager;

  constructor({
    productRepository,
    categoryRepository,
    brandRepository,
    outboxService,
    transactionManager,
  }: ProductServiceDependencies) {
    this.productRepository = productRepository;
    this.categoryRepository = categoryRepository;
    this.brandRepository = brandRepository;
    this.outboxService = outboxService;
    this.transactionManager = transactionManager;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);

    let candidate = base;
    let suffix = 1;

    while (await this.productRepository.exists({ slug: candidate })) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }

    return candidate;
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw new NotFoundError("Category not found");
    }
  }

  private async assertBrandExists(brandId: string): Promise<void> {
    const brand = await this.brandRepository.findById(brandId);

    if (!brand) {
      throw new NotFoundError("Brand not found");
    }
  }

  private async requireProduct(productId: string): Promise<ProductRow> {
    const product = await this.productRepository.findRawById(productId);

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    return product;
  }

  /** Archived products are read-only: nothing may mutate them further. */
  private async requireEditableProduct(productId: string): Promise<ProductRow> {
    const product = await this.requireProduct(productId);

    if (product.status === ProductStatus.ARCHIVED) {
      throw new ConflictError("Cannot modify an archived product");
    }

    return product;
  }

  /** Re-reads the aggregate a mutation just produced. */
  private async requireAggregate(id: string): Promise<ProductAggregateRow> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    return product;
  }

  /**
   * Applies a patch and records ProductUpdated in the same transaction, so
   * the event can never exist without the change (or the change without the
   * event).
   */
  private async applyPatch(
    id: string,
    patch: UpdateProductPatch,
    changedFields: string[],
  ): Promise<void> {
    await this.transactionManager.execute(async (tx) => {
      const updated = await this.productRepository.update(id, patch, tx);

      if (!updated) {
        throw new InternalServerError(
          `Product ${id} disappeared while being updated`,
        );
      }

      await this.outboxService.addEvent(
        ProductUpdated.build(updated, changedFields),
        tx,
      );
    });
  }

  async createProduct(
    data: CreateProductCommand,
  ): Promise<ProductAggregateRow> {
    const skuTaken = await this.productRepository.exists({ sku: data.sku });

    if (skuTaken) {
      throw new ConflictError(`SKU '${data.sku}' already exists`);
    }

    if (data.categoryId) {
      await this.assertCategoryExists(data.categoryId);
    }

    if (data.brandId) {
      await this.assertBrandExists(data.brandId);
    }

    const slug = await this.generateUniqueSlug(data.name);

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

    return this.requireAggregate(created.id);
  }

  async updateProduct(
    id: string,
    patch: UpdateProductPatch,
  ): Promise<ProductAggregateRow> {
    await this.requireEditableProduct(id);

    if (Object.keys(patch).length === 0) {
      return this.requireAggregate(id);
    }

    await this.applyPatch(id, patch, Object.keys(patch));

    return this.requireAggregate(id);
  }

  async changeCategory(
    productId: string,
    categoryId: string | null,
  ): Promise<ProductAggregateRow> {
    await this.requireEditableProduct(productId);

    if (categoryId) {
      await this.assertCategoryExists(categoryId);
    }

    await this.applyPatch(productId, { categoryId }, ["categoryId"]);

    return this.requireAggregate(productId);
  }

  async changeBrand(
    productId: string,
    brandId: string | null,
  ): Promise<ProductAggregateRow> {
    await this.requireEditableProduct(productId);

    if (brandId) {
      await this.assertBrandExists(brandId);
    }

    await this.applyPatch(productId, { brandId }, ["brandId"]);

    return this.requireAggregate(productId);
  }

  /** Guarded by the transition table in constants/ProductStatus. */
  private async transitionStatus(
    id: string,
    targetStatus: ProductStatusValue,
  ): Promise<ProductAggregateRow> {
    const product = await this.requireProduct(id);

    if (!canTransition(product.status, targetStatus)) {
      throw new ConflictError(
        `Cannot transition product from ${product.status} to ${targetStatus}`,
      );
    }

    await this.applyPatch(id, { status: targetStatus }, ["status"]);

    return this.requireAggregate(id);
  }

  async activateProduct(id: string): Promise<ProductAggregateRow> {
    return this.transitionStatus(id, ProductStatus.ACTIVE);
  }

  async deactivateProduct(id: string): Promise<ProductAggregateRow> {
    return this.transitionStatus(id, ProductStatus.INACTIVE);
  }

  async archiveProduct(id: string): Promise<ProductAggregateRow> {
    const product = await this.requireProduct(id);

    if (!canTransition(product.status, ProductStatus.ARCHIVED)) {
      throw new ConflictError(
        `Cannot transition product from ${product.status} to ARCHIVED`,
      );
    }

    const archived = await this.transactionManager.execute(async (tx) => {
      const result = await this.productRepository.archive(id, tx);

      if (!result) {
        throw new InternalServerError(
          `Product ${id} disappeared while being archived`,
        );
      }

      await this.outboxService.addEvent(ProductArchived.build(result), tx);

      return result;
    });

    return this.requireAggregate(archived.id);
  }

  async addImages(
    productId: string,
    images: ProductImageInput[],
  ): Promise<ProductAggregateRow> {
    await this.requireEditableProduct(productId);

    await this.transactionManager.execute((tx) =>
      this.productRepository.addImages(productId, images, tx),
    );

    return this.requireAggregate(productId);
  }

  async replaceImages(
    productId: string,
    images: ProductImageInput[],
  ): Promise<ProductAggregateRow> {
    await this.requireEditableProduct(productId);

    await this.transactionManager.execute((tx) =>
      this.productRepository.replaceImages(productId, images, tx),
    );

    return this.requireAggregate(productId);
  }

  async removeImage(
    productId: string,
    imageId: string,
  ): Promise<ProductAggregateRow> {
    await this.requireProduct(productId);

    const removed = await this.productRepository.removeImage(
      productId,
      imageId,
    );

    if (!removed) {
      throw new NotFoundError("Image not found on this product");
    }

    return this.requireAggregate(productId);
  }

  async getProduct(id: string): Promise<ProductAggregateRow> {
    return this.requireAggregate(id);
  }

  async getProductBySlug(slug: string): Promise<ProductAggregateRow> {
    const product = await this.productRepository.findBySlug(slug);

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    return product;
  }

  async searchProducts(
    filters: ProductSearchQuery,
  ): Promise<PaginatedResponse<ProductAggregateRow>> {
    const { items, total } = await this.productRepository.search(filters);

    return {
      items,
      pagination: buildPaginationMeta(filters.page, filters.limit, total),
    };
  }
}
