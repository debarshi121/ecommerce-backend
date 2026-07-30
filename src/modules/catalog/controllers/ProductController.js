// src/modules/catalog/controllers/ProductController.js

const CreateProductDto = require("../dto/CreateProductDto");
const UpdateProductDto = require("../dto/UpdateProductDto");
const ProductResponseDto = require("../dto/ProductResponseDto");

class ProductController {
  constructor(productService) {
    this.productService = productService;
  }

  async create(req, res, next) {
    try {
      const data = CreateProductDto.fromRequest(req.body);

      const product = await this.productService.createProduct(data);

      return res.status(201).json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const { items, pagination } = await this.productService.searchProducts(
        req.query,
      );

      return res.json({
        items: ProductResponseDto.fromList(items),
        pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await this.productService.getProduct(req.params.id);

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async getBySlug(req, res, next) {
    try {
      const product = await this.productService.getProductBySlug(
        req.params.slug,
      );

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const patch = UpdateProductDto.fromRequest(req.body);

      const product = await this.productService.updateProduct(
        req.params.id,
        patch,
      );

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async changeCategory(req, res, next) {
    try {
      const product = await this.productService.changeCategory(
        req.params.id,
        req.body.categoryId,
      );

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async changeBrand(req, res, next) {
    try {
      const product = await this.productService.changeBrand(
        req.params.id,
        req.body.brandId,
      );

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async archive(req, res, next) {
    try {
      const product = await this.productService.archiveProduct(req.params.id);

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async activate(req, res, next) {
    try {
      const product = await this.productService.activateProduct(req.params.id);

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req, res, next) {
    try {
      const product = await this.productService.deactivateProduct(
        req.params.id,
      );

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async addImages(req, res, next) {
    try {
      const product = await this.productService.addImages(
        req.params.id,
        req.body.images,
      );

      return res.status(201).json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async replaceImages(req, res, next) {
    try {
      const product = await this.productService.replaceImages(
        req.params.id,
        req.body.images,
      );

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }

  async removeImage(req, res, next) {
    try {
      const product = await this.productService.removeImage(
        req.params.id,
        req.params.imageId,
      );

      return res.json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductController;
