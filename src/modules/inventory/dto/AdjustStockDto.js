// src/modules/inventory/dto/AdjustStockDto.js

class AdjustStockDto {
  static fromRequest(body) {
    return {
      quantityDelta: body.quantityDelta,
      reason: body.reason ? body.reason.trim() : null,
    };
  }
}

module.exports = AdjustStockDto;
