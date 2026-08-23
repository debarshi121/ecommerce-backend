// src/modules/catalog/services/BrandService.ts

import { ConflictError } from "../../../shared/errors/ConflictError";
import { NotFoundError } from "../../../shared/errors/NotFoundError";
import type { BrandRow } from "../../../shared/types/entities";
import { slugify } from "../../../shared/utils/slugify";
import type {
  CreateBrandCommand,
  IBrandRepository,
  UpdateBrandPatch,
} from "../contracts";

export interface BrandServiceDependencies {
  brandRepository: IBrandRepository;
}

export class BrandService {
  private readonly brandRepository: IBrandRepository;

  constructor({ brandRepository }: BrandServiceDependencies) {
    this.brandRepository = brandRepository;
  }

  /** Appends -2, -3, ... until the slug is free. */
  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);

    let candidate = base;
    let suffix = 1;

    while (await this.brandRepository.findBySlug(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }

    return candidate;
  }

  private async requireBrand(id: string): Promise<BrandRow> {
    const brand = await this.brandRepository.findById(id);

    if (!brand) {
      throw new NotFoundError("Brand not found");
    }

    return brand;
  }

  async createBrand(data: CreateBrandCommand): Promise<BrandRow> {
    const existing = await this.brandRepository.findByName(data.name);

    if (existing) {
      throw new ConflictError(`Brand '${data.name}' already exists`);
    }

    const slug = await this.generateUniqueSlug(data.name);

    return this.brandRepository.create({
      name: data.name,
      logo: data.logo || null,
      description: data.description || null,
      slug,
    });
  }

  async updateBrand(
    id: string,
    patch: UpdateBrandPatch,
  ): Promise<BrandRow | null> {
    const brand = await this.requireBrand(id);

    if (patch.name && patch.name !== brand.name) {
      const existing = await this.brandRepository.findByName(patch.name);

      if (existing && existing.id !== id) {
        throw new ConflictError(`Brand '${patch.name}' already exists`);
      }
    }

    return this.brandRepository.update(id, patch);
  }

  async deleteBrand(id: string): Promise<void> {
    await this.requireBrand(id);

    const productCount = await this.brandRepository.countProducts(id);

    if (productCount > 0) {
      throw new ConflictError(
        "Cannot delete a brand that has products assigned",
      );
    }

    await this.brandRepository.delete(id);
  }

  async getBrand(id: string): Promise<BrandRow> {
    return this.requireBrand(id);
  }

  async getBrands(): Promise<BrandRow[]> {
    return this.brandRepository.findAll();
  }
}
