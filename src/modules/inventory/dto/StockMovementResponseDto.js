// src/modules/inventory/dto/StockMovementResponseDto.js

class StockMovementResponseDto {
  static fromEntity(movement) {
    if (!movement) {
      return null;
    }

    return {
      id: movement.id,
      productId: movement.productId,
      movementType: movement.movementType,
      quantity: movement.quantity,
      referenceId: movement.referenceId,
      reason: movement.reason,
      createdAt: movement.createdAt,
    };
  }

  static fromList(items) {
    return items.map((item) => StockMovementResponseDto.fromEntity(item));
  }
}

module.exports = StockMovementResponseDto;
