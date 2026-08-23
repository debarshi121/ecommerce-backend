// src/modules/catalog/controllers/CategoryController.ts

import type { NextFunction, Request, Response } from "express";

import { validated } from "../../../shared/validators/validate";

import { CategoryResponseDto } from "../dto/CategoryResponseDto";
import type { CategoryService } from "../services/CategoryService";
import type { CategoryIdParamInput } from "../validators/CategoryIdParamValidator";
import type { CreateCategoryInput } from "../validators/CreateCategoryValidator";
import type { UpdateCategoryInput } from "../validators/UpdateCategoryValidator";

export class CategoryController {
  private readonly categoryService: CategoryService;

  constructor(categoryService: CategoryService) {
    this.categoryService = categoryService;
  }

  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { body } = validated<CreateCategoryInput>(req);

      const category = await this.categoryService.createCategory(body);

      return res.status(201).json(CategoryResponseDto.fromEntity(category));
    } catch (error) {
      next(error);
    }
  }

  async tree(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const categories = await this.categoryService.getTree();

      return res.json(CategoryResponseDto.fromList(categories));
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
      const { params } = validated<CategoryIdParamInput>(req);

      const category = await this.categoryService.getCategory(params.id);

      return res.json(CategoryResponseDto.fromEntity(category));
    } catch (error) {
      next(error);
    }
  }

  async children(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params } = validated<CategoryIdParamInput>(req);

      const categories = await this.categoryService.getChildren(params.id);

      return res.json(CategoryResponseDto.fromList(categories));
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
      const { params, body } = validated<UpdateCategoryInput>(req);

      const category = await this.categoryService.updateCategory(
        params.id,
        body,
      );

      return res.json(CategoryResponseDto.fromEntity(category));
    } catch (error) {
      next(error);
    }
  }

  async delete(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params } = validated<CategoryIdParamInput>(req);

      await this.categoryService.deleteCategory(params.id);

      return res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }
}
