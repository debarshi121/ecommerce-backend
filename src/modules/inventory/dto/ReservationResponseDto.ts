// src/modules/inventory/dto/ReservationResponseDto.ts

import type { ReservationRow } from "../../../shared/types/entities";
import type { ReservationStatusValue } from "../constants/ReservationStatus";

export interface ReservationResponse {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  status: ReservationStatusValue;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ReservationResponseDto {
  static fromEntity(
    reservation: ReservationRow | null,
  ): ReservationResponse | null {
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

  static fromList(items: ReservationRow[]): (ReservationResponse | null)[] {
    return items.map((item) => ReservationResponseDto.fromEntity(item));
  }
}
