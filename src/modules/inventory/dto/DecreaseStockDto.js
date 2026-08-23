// src/modules/inventory/dto/DecreaseStockDto.js

class DecreaseStockDto {
  static fromRequest(body) {
    return {
      quantity: body.quantity,
      reason: body.reason ? body.reason.trim() : null,
    };
  }
}

module.exports = DecreaseStockDto;
