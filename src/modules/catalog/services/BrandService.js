// src/modules/catalog/services/BrandService.js

const slugify = require("../../../shared/utils/slugify");

const NotFoundError = require("../../../shared/errors/NotFoundError");
const ConflictError = require("../../../shared/errors/ConflictError");

class BrandService {
  constructor({ brandRepository }) {
    this.brandRepository = brandRepository;
  }

  async _generateUniqueSlug(name) {
    const base = slugify(name);

    let candidate = base;
    let suffix = 1;

    while (await this.brandRepository.findBySlug(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }

    return candidate;
  }

  async createBrand(data) {
    const existing = await this.brandRepository.findByName(data.name);

    if (existing) {
      throw new ConflictError(`Brand '${data.name}' already exists`);
    }

    const slug = await this._generateUniqueSlug(data.name);

    return this.brandRepository.create({
      name: data.name,
      logo: data.logo || null,
      description: data.description || null,
      slug,
    });
  }

  async updateBrand(id, patch) {
    const brand = await this.brandRepository.findById(id);

    if (!brand) {
      throw new NotFoundError("Brand not found");
    }

    if (patch.name && patch.name !== brand.name) {
      const existing = await this.brandRepository.findByName(patch.name);

      if (existing && existing.id !== id) {
        throw new ConflictError(`Brand '${patch.name}' already exists`);
      }
    }

    return this.brandRepository.update(id, patch);
  }

  async deleteBrand(id) {
    const brand = await this.brandRepository.findById(id);

    if (!brand) {
      throw new NotFoundError("Brand not found");
    }

    const productCount = await this.brandRepository.countProducts(id);

    if (productCount > 0) {
      throw new ConflictError("Cannot delete a brand that has products assigned");
    }

    await this.brandRepository.delete(id);
  }

  async getBrand(id) {
    const brand = await this.brandRepository.findById(id);

    if (!brand) {
      throw new NotFoundError("Brand not found");
    }

    return brand;
  }

  async getBrands() {
    return this.brandRepository.findAll();
  }
}

module.exports = BrandService;
