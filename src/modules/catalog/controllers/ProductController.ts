// src/modules/catalog/controllers/ProductController.ts

import type { NextFunction, Request, Response } from "express";

import { validated } from "../../../shared/validators/validate";

import { CreateProductDto } from "../dto/CreateProductDto";
import { ProductResponseDto } from "../dto/ProductResponseDto";
import { UpdateProductDto } from "../dto/UpdateProductDto";
import type { ProductService } from "../services/ProductService";
import type { AddProductImagesInput } from "../validators/AddProductImagesValidator";
import type { ChangeProductBrandInput } from "../validators/ChangeProductBrandValidator";
import type { ChangeProductCategoryInput } from "../validators/ChangeProductCategoryValidator";
import type { CreateProductInput } from "../validators/CreateProductValidator";
import type { ProductIdParamInput } from "../validators/ProductIdParamValidator";
import type { ProductQueryInput } from "../validators/ProductQueryValidator";
import type { RemoveProductImageInput } from "../validators/RemoveProductImageValidator";
import type { ReplaceProductImagesInput } from "../validators/ReplaceProductImagesValidator";
import type { UpdateProductInput } from "../validators/UpdateProductValidator";

/**
 * Translates HTTP into service calls and entities into response DTOs. Every
 * handler reads its input through `validated<T>()`, so the type it works with
 * is exactly what the route's Zod schema produced.
 */
export class ProductController {
  private readonly productService: ProductService;

  constructor(productService: ProductService) {
    this.productService = productService;
  }

  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { body } = validated<CreateProductInput>(req);

      const data = CreateProductDto.fromRequest(body);

      const product = await this.productService.createProduct(data);

      return res.status(201).json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async list(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { query } = validated<ProductQueryInput>(req);

      const { items, pagination } =
        await this.productService.searchProducts(query);

      return res.json({
        items: ProductResponseDto.fromList(items),
        pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params } = validated<ProductIdParamInput>(req);

      const product = await this.productService.getProduct(params.id);

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async getBySlug(
    req: Request<{ slug: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const product = await this.productService.getProductBySlug(
        req.params.slug,
      );

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async update(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params, body } = validated<UpdateProductInput>(req);

      const patch = UpdateProductDto.fromRequest(body);

      const product = await this.productService.updateProduct(params.id, patch);

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async changeCategory(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params, body } = validated<ChangeProductCategoryInput>(req);

      const product = await this.productService.changeCategory(
        params.id,
        body.categoryId,
      );

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async changeBrand(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params, body } = validated<ChangeProductBrandInput>(req);

      const product = await this.productService.changeBrand(
        params.id,
        body.brandId,
      );

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async archive(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params } = validated<ProductIdParamInput>(req);

      const product = await this.productService.archiveProduct(params.id);

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async activate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params } = validated<ProductIdParamInput>(req);

      const product = await this.productService.activateProduct(params.id);

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async deactivate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params } = validated<ProductIdParamInput>(req);

      const product = await this.productService.deactivateProduct(params.id);

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async addImages(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params, body } = validated<AddProductImagesInput>(req);

      const product = await this.productService.addImages(
        params.id,
        body.images,
      );

      return res.status(201).json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async replaceImages(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params, body } = validated<ReplaceProductImagesInput>(req);

      const product = await this.productService.replaceImages(
        params.id,
        body.images,
      );

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async removeImage(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params } = validated<RemoveProductImageInput>(req);

      const product = await this.productService.removeImage(
        params.id,
        params.imageId,
      );

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }
}
