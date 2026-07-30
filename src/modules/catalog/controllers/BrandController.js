// src/modules/catalog/controllers/BrandController.js

const BrandResponseDto = require("../dto/BrandResponseDto");

class BrandController {
  constructor(brandService) {
    this.brandService = brandService;
  }

  async create(req, res, next) {
    try {
      const brand = await this.brandService.createBrand(req.body);

      return res.status(201).json(BrandResponseDto.fromEntity(brand));
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const brands = await this.brandService.getBrands();

      return res.json(BrandResponseDto.fromList(brands));
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const brand = await this.brandService.getBrand(req.params.id);

      return res.json(BrandResponseDto.fromEntity(brand));
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const brand = await this.brandService.updateBrand(
        req.params.id,
        req.body,
      );

      return res.json(BrandResponseDto.fromEntity(brand));
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.brandService.deleteBrand(req.params.id);

      return res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BrandController;
