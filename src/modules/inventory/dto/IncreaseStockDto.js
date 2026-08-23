// src/modules/inventory/dto/IncreaseStockDto.js

class IncreaseStockDto {
  static fromRequest(body) {
    return {
      quantity: body.quantity,
      reason: body.reason ? body.reason.trim() : null,
    };
  }
}

module.exports = IncreaseStockDto;
