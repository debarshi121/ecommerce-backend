// src/modules/catalog/controllers/CategoryController.js

const CategoryResponseDto = require("../dto/CategoryResponseDto");

class CategoryController {
  constructor(categoryService) {
    this.categoryService = categoryService;
  }

  async create(req, res, next) {
    try {
      const category = await this.categoryService.createCategory(req.body);

      return res.status(201).json(CategoryResponseDto.fromEntity(category));
    } catch (error) {
      next(error);
    }
  }

  async tree(req, res, next) {
    try {
      const categories = await this.categoryService.getTree();

      return res.json(CategoryResponseDto.fromList(categories));
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const category = await this.categoryService.getCategory(req.params.id);

      return res.json(CategoryResponseDto.fromEntity(category));
    } catch (error) {
      next(error);
    }
  }

  async children(req, res, next) {
    try {
      const categories = await this.categoryService.getChildren(
        req.params.id,
      );

      return res.json(CategoryResponseDto.fromList(categories));
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const category = await this.categoryService.updateCategory(
        req.params.id,
        req.body,
      );

      return res.json(CategoryResponseDto.fromEntity(category));
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.categoryService.deleteCategory(req.params.id);

      return res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CategoryController;
