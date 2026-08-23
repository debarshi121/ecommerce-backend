// src/modules/inventory/services/ReservationService.js

const ConflictError = require("../../../shared/errors/ConflictError");

const ReservationStatus = require("../constants/ReservationStatus");

// Owns the reservation row's lifecycle (state + transition validation).
// It never touches inventory quantities directly — InventoryService
// orchestrates quantity changes and reservation-state changes together
// inside a single database transaction.
class ReservationService {
  constructor({ reservationRepository }) {
    this.reservationRepository = reservationRepository;
  }

  _assertTransitionAllowed(fromStatus, toStatus) {
    const allowed = ReservationStatus.ALLOWED_TRANSITIONS[fromStatus] || [];

    if (!allowed.includes(toStatus)) {
      throw new ConflictError(
        `Cannot transition reservation from ${fromStatus} to ${toStatus}`,
      );
    }
  }

  async createPending({ orderId, productId, quantity }, tx = null) {
    return this.reservationRepository.create(
      { orderId, productId, quantity, status: ReservationStatus.PENDING },
      tx,
    );
  }

  async markReserved(reservation, tx = null) {
    this._assertTransitionAllowed(reservation.status, ReservationStatus.RESERVED);

    const expiresAt = new Date(
      Date.now() + ReservationStatus.DEFAULT_TTL_MINUTES * 60 * 1000,
    );

    return this.reservationRepository.updateStatus(
      reservation.id,
      ReservationStatus.RESERVED,
      { expiresAt },
      tx,
    );
  }

  async markFailed(reservation, tx = null) {
    this._assertTransitionAllowed(reservation.status, ReservationStatus.FAILED);

    return this.reservationRepository.updateStatus(
      reservation.id,
      ReservationStatus.FAILED,
      {},
      tx,
    );
  }

  async markReleased(reservation, tx = null) {
    this._assertTransitionAllowed(reservation.status, ReservationStatus.RELEASED);

    return this.reservationRepository.updateStatus(
      reservation.id,
      ReservationStatus.RELEASED,
      {},
      tx,
    );
  }

  async markConfirmed(reservation, tx = null) {
    this._assertTransitionAllowed(reservation.status, ReservationStatus.CONFIRMED);

    return this.reservationRepository.updateStatus(
      reservation.id,
      ReservationStatus.CONFIRMED,
      {},
      tx,
    );
  }

  async markExpired(reservation, tx = null) {
    this._assertTransitionAllowed(reservation.status, ReservationStatus.EXPIRED);

    return this.reservationRepository.updateStatus(
      reservation.id,
      ReservationStatus.EXPIRED,
      {},
      tx,
    );
  }

  async getByOrderId(orderId, tx = null) {
    return this.reservationRepository.findByOrderId(orderId, tx);
  }

  async getProductReservations({ productId, status, page, limit }, tx = null) {
    return this.reservationRepository.findProductReservations(
      { productId, status, page, limit },
      tx,
    );
  }

  async findExpired(limit = 100, tx = null) {
    return this.reservationRepository.findPendingExpired(limit, tx);
  }
}

module.exports = ReservationService;
