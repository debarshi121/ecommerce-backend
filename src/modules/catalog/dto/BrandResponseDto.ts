// src/modules/catalog/dto/BrandResponseDto.ts

import type { BrandRow } from "../../../shared/types/entities";

/** The brand shape sent to HTTP clients. */
export interface BrandResponse {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class BrandResponseDto {
  static fromEntity(brand: BrandRow | null): BrandResponse | null {
    if (!brand) {
      return null;
    }

    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo,
      description: brand.description,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }

  static fromList(brands: BrandRow[]): (BrandResponse | null)[] {
    return brands.map((brand) => BrandResponseDto.fromEntity(brand));
  }
}
