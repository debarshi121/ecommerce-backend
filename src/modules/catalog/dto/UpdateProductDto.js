// src/modules/catalog/dto/UpdateProductDto.js

class UpdateProductDto {
  static fromRequest(body) {
    const patch = {};

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

module.exports = UpdateProductDto;
