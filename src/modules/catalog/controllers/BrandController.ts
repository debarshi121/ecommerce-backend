// src/modules/catalog/controllers/BrandController.ts

import type { NextFunction, Request, Response } from "express";

import { validated } from "../../../shared/validators/validate";

import { BrandResponseDto } from "../dto/BrandResponseDto";
import type { BrandService } from "../services/BrandService";
import type { BrandIdParamInput } from "../validators/BrandIdParamValidator";
import type { CreateBrandInput } from "../validators/CreateBrandValidator";
import type { UpdateBrandInput } from "../validators/UpdateBrandValidator";

export class BrandController {
  private readonly brandService: BrandService;

  constructor(brandService: BrandService) {
    this.brandService = brandService;
  }

  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { body } = validated<CreateBrandInput>(req);

      const brand = await this.brandService.createBrand(body);

      return res.status(201).json(BrandResponseDto.fromEntity(brand));
    } catch (error) {
      next(error);
    }
  }

  async list(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const brands = await this.brandService.getBrands();

      return res.json(BrandResponseDto.fromList(brands));
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
      const { params } = validated<BrandIdParamInput>(req);

      const brand = await this.brandService.getBrand(params.id);

      return res.json(BrandResponseDto.fromEntity(brand));
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
      const { params, body } = validated<UpdateBrandInput>(req);

      const brand = await this.brandService.updateBrand(params.id, body);

      return res.json(BrandResponseDto.fromEntity(brand));
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
      const { params } = validated<BrandIdParamInput>(req);

      await this.brandService.deleteBrand(params.id);

      return res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }
}
