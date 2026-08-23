// src/modules/inventory/dto/ReservationResponseDto.js

class ReservationResponseDto {
  static fromEntity(reservation) {
    if (!reservation) {
      return null;
    }

    return {
      id: reservation.id,
      orderId: reservation.orderId,
      productId: reservation.productId,
      quantity: reservation.quantity,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };
  }

  static fromList(items) {
    return items.map((item) => ReservationResponseDto.fromEntity(item));
  }
}

module.exports = ReservationResponseDto;
