// src/modules/catalog/dto/UpdateProductDto.ts

import type { UpdateProductPatch } from "../contracts";
import type { UpdateProductInput } from "../validators/UpdateProductValidator";

/**
 * Builds a sparse patch: a key is written only if the client actually sent
 * it, which is what keeps `changedFields` on ProductUpdated honest and stops
 * an omitted field being overwritten with null.
 */
export class UpdateProductDto {
  static fromRequest(body: UpdateProductInput["body"]): UpdateProductPatch {
    const patch: UpdateProductPatch = {};

    if (body.name !== undefined) {
      patch.name = body.name.trim();
    }

    if (body.shortDescription !== undefined) {
      patch.shortDescription = body.shortDescription
        ? body.shortDescription.trim()
        : null;
    }

    if (body.description !== undefined) {
      patch.description = body.description ? body.description.trim() : null;
    }

    if (body.metadata !== undefined) {
      patch.metadata = body.metadata;
    }

    return patch;
  }
}
