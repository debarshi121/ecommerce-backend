// src/modules/inventory/dto/InventoryResponseDto.js

class InventoryResponseDto {
  static fromEntity(inventory) {
    if (!inventory) {
      return null;
    }

    return {
      id: inventory.id,
      productId: inventory.productId,
      availableQuantity: inventory.availableQuantity,
      reservedQuantity: inventory.reservedQuantity,
      totalQuantity: inventory.availableQuantity + inventory.reservedQuantity,
      version: inventory.version,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    };
  }

  static fromList(items) {
    return items.map((item) => InventoryResponseDto.fromEntity(item));
  }
}

module.exports = InventoryResponseDto;
