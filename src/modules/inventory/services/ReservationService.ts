// src/modules/inventory/services/ReservationService.ts

import { ConflictError } from "../../../shared/errors/ConflictError";
import type { MaybeTransaction } from "../../../shared/types/database";
import type { ReservationRow } from "../../../shared/types/entities";
import type { Page } from "../../../shared/types/pagination";

import {
  canTransition,
  RESERVATION_DEFAULT_TTL_MINUTES,
  ReservationStatus,
  type ReservationStatusValue,
} from "../constants/ReservationStatus";
import type {
  CreatePendingReservation,
  IReservationRepository,
  IReservationService,
  ProductReservationsQuery,
  ReservationStatusExtra,
} from "../contracts";

export interface ReservationServiceDependencies {
  reservationRepository: IReservationRepository;
}

// Owns the reservation row's lifecycle (state + transition validation).
// It never touches inventory quantities directly — InventoryService
// orchestrates quantity changes and reservation-state changes together
// inside a single database transaction.
export class ReservationService implements IReservationService {
  private readonly reservationRepository: IReservationRepository;

  constructor({ reservationRepository }: ReservationServiceDependencies) {
    this.reservationRepository = reservationRepository;
  }

  private assertTransitionAllowed(
    fromStatus: ReservationStatusValue,
    toStatus: ReservationStatusValue,
  ): void {
    if (!canTransition(fromStatus, toStatus)) {
      throw new ConflictError(
        `Cannot transition reservation from ${fromStatus} to ${toStatus}`,
      );
    }
  }

  /** Single funnel for every state change, so no path can skip the guard. */
  private async transition(
    reservation: ReservationRow,
    toStatus: ReservationStatusValue,
    extra: ReservationStatusExtra = {},
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow | null> {
    this.assertTransitionAllowed(reservation.status, toStatus);

    return this.reservationRepository.updateStatus(
      reservation.id,
      toStatus,
      extra,
      tx,
    );
  }

  async createPending(
    { orderId, productId, quantity }: CreatePendingReservation,
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow> {
    return this.reservationRepository.create(
      { orderId, productId, quantity, status: ReservationStatus.PENDING },
      tx,
    );
  }

  async markReserved(
    reservation: ReservationRow,
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow | null> {
    const expiresAt = new Date(
      Date.now() + RESERVATION_DEFAULT_TTL_MINUTES * 60 * 1000,
    );

    return this.transition(
      reservation,
      ReservationStatus.RESERVED,
      { expiresAt },
      tx,
    );
  }

  async markFailed(
    reservation: ReservationRow,
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow | null> {
    return this.transition(reservation, ReservationStatus.FAILED, {}, tx);
  }

  async markReleased(
    reservation: ReservationRow,
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow | null> {
    return this.transition(reservation, ReservationStatus.RELEASED, {}, tx);
  }

  async markConfirmed(
    reservation: ReservationRow,
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow | null> {
    return this.transition(reservation, ReservationStatus.CONFIRMED, {}, tx);
  }

  async markExpired(
    reservation: ReservationRow,
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow | null> {
    return this.transition(reservation, ReservationStatus.EXPIRED, {}, tx);
  }

  async getByOrderId(
    orderId: string,
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow[]> {
    return this.reservationRepository.findByOrderId(orderId, tx);
  }

  async getProductReservations(
    { productId, status, page, limit }: ProductReservationsQuery,
    tx: MaybeTransaction = null,
  ): Promise<Page<ReservationRow>> {
    return this.reservationRepository.findProductReservations(
      { productId, ...(status ? { status } : {}), page, limit },
      tx,
    );
  }

  async findExpired(
    limit = 100,
    tx: MaybeTransaction = null,
  ): Promise<ReservationRow[]> {
    return this.reservationRepository.findPendingExpired(limit, tx);
  }
}
