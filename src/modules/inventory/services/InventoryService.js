// src/modules/inventory/services/InventoryService.js

const NotFoundError = require("../../../shared/errors/NotFoundError");
const ConflictError = require("../../../shared/errors/ConflictError");
const BadRequestError = require("../../../shared/errors/BadRequestError");

const StockMovementType = require("../constants/StockMovementType");
const ReservationStatus = require("../constants/ReservationStatus");

const InventoryReserved = require("../events/InventoryReserved");
const InventoryReleased = require("../events/InventoryReleased");
const InventoryAdjusted = require("../events/InventoryAdjusted");
const InventoryLow = require("../events/InventoryLow");
const InventoryReservationFailed = require("../events/InventoryReservationFailed");

// A losing optimistic writer simply re-reads and retries — under READ
// COMMITTED every retry's SELECT sees the latest committed version, so a
// small, bounded number of attempts is enough to converge even under heavy
// contention on a single hot product row.
const MAX_OPTIMISTIC_RETRIES = 5;

// Not part of the requested `inventory` schema (which is deliberately just
// id/productId/availableQuantity/reservedQuantity/version/timestamps), so
// this stays a single global threshold rather than a per-row column. A
// per-product threshold is a natural follow-up (see docs).
const LOW_STOCK_THRESHOLD = Number(process.env.INVENTORY_LOW_STOCK_THRESHOLD || 10);

class InventoryService {
  constructor({
    inventoryRepository,
    reservationService,
    stockMovementRepository,
    outboxService,
    transactionManager,
  }) {
    this.inventoryRepository = inventoryRepository;
    this.reservationService = reservationService;
    this.stockMovementRepository = stockMovementRepository;
    this.outboxService = outboxService;
    this.transactionManager = transactionManager;
  }

  /*
  |--------------------------------------------------------------------------
  | Internal helpers
  |--------------------------------------------------------------------------
  */

  // Consumers already hold a transaction opened by InboxService (so the
  // inbox row + the business writes commit/rollback atomically). HTTP-driven
  // calls don't, so they get one opened here instead.
  async _withTransaction(tx, run) {
    if (tx) {
      return run(tx);
    }

    return this.transactionManager.execute(run);
  }

  async _requireInventory(productId, tx) {
    const inventory = await this.inventoryRepository.findByProductId(productId, tx);

    if (!inventory) {
      throw new NotFoundError(`Inventory not found for product ${productId}`);
    }

    return inventory;
  }

  // Runs `attempt` until it returns a non-null row. `attempt` must re-read
  // the current row itself and either return the updated row, return null to
  // signal "version moved under me, retry", or throw for a genuine business
  // error (which propagates immediately, no retry).
  async _retryOptimistic(attempt) {
    for (let i = 0; i < MAX_OPTIMISTIC_RETRIES; i += 1) {
      const result = await attempt();

      if (result !== null) {
        return result;
      }
    }

    throw new ConflictError(
      "Concurrent inventory update conflict — too many retries, please try again",
    );
  }

  // Reservation has a genuine soft-fail branch (insufficient stock) that
  // must NOT be retried, so it gets its own loop instead of reusing
  // _retryOptimistic (which only distinguishes "retry" from "throw").
  async _attemptReserve(reservation, tx) {
    for (let i = 0; i < MAX_OPTIMISTIC_RETRIES; i += 1) {
      const current = await this.inventoryRepository.findByProductId(reservation.productId, tx);

      if (!current) {
        return { ok: false, reason: "INVENTORY_NOT_FOUND", available: 0 };
      }

      if (current.availableQuantity < reservation.quantity) {
        return { ok: false, reason: "INSUFFICIENT_STOCK", available: current.availableQuantity };
      }

      const updated = await this.inventoryRepository.optimisticUpdate(
        current.id,
        {
          availableQuantity: current.availableQuantity - reservation.quantity,
          reservedQuantity: current.reservedQuantity + reservation.quantity,
          expectedVersion: current.version,
        },
        tx,
      );

      if (updated) {
        return { ok: true, inventory: updated };
      }

      // version changed under us — loop and re-read the fresh row
    }

    throw new ConflictError(
      `Could not reserve stock for product ${reservation.productId} after ${MAX_OPTIMISTIC_RETRIES} attempts`,
    );
  }

  async _maybePublishLowStock(inventory, tx) {
    if (inventory.availableQuantity <= LOW_STOCK_THRESHOLD) {
      await this.outboxService.addEvent(
        InventoryLow.build({
          productId: inventory.productId,
          availableQuantity: inventory.availableQuantity,
          threshold: LOW_STOCK_THRESHOLD,
        }),
        tx,
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Business methods
  |--------------------------------------------------------------------------
  */

  async createInventory({ productId }, tx = null) {
    return this._withTransaction(tx, async (trx) => {
      const alreadyExists = await this.inventoryRepository.exists(productId, trx);

      if (alreadyExists) {
        throw new ConflictError(`Inventory already exists for product ${productId}`);
      }

      const inventory = await this.inventoryRepository.createInventory(
        { productId, availableQuantity: 0, reservedQuantity: 0 },
        trx,
      );

      await this.stockMovementRepository.createMovement(
        {
          productId,
          movementType: StockMovementType.INITIAL,
          quantity: 0,
          referenceId: null,
          reason: "Inventory record created for new product",
        },
        trx,
      );

      await this.outboxService.addEvent(
        InventoryAdjusted.build({
          productId,
          movementType: StockMovementType.INITIAL,
          quantity: 0,
          availableQuantity: inventory.availableQuantity,
          reservedQuantity: inventory.reservedQuantity,
        }),
        trx,
      );

      return inventory;
    });
  }

  // Reserves stock for every line item of an order as a single all-or-nothing
  // unit of work. See docs/README for the full algorithm — in short: create
  // every reservation PENDING up front (audit trail even for lines never
  // attempted), then walk the list attempting each in turn; the first
  // shortage short-circuits the rest to FAILED and compensates (releases)
  // whatever had already succeeded, all inside the same DB transaction so it
  // commits as one atomic "the order could not be reserved" outcome.
  async reserveStock({ orderId, items }, tx = null) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestError("items must be a non-empty array");
    }

    items.forEach((item) => {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestError(
          "each item requires a productId and a positive integer quantity",
        );
      }
    });

    return this._withTransaction(tx, async (trx) => {
      const pending = [];

      for (const item of items) {
        const reservation = await this.reservationService.createPending(
          { orderId, productId: item.productId, quantity: item.quantity },
          trx,
        );

        pending.push(reservation);
      }

      const succeeded = [];
      let shortage = null;

      for (const reservation of pending) {
        if (shortage) {
          await this.reservationService.markFailed(reservation, trx);
          continue;
        }

        const attempt = await this._attemptReserve(reservation, trx);

        if (!attempt.ok) {
          shortage = {
            productId: reservation.productId,
            reason: attempt.reason,
            requested: reservation.quantity,
            available: attempt.available,
          };

          await this.reservationService.markFailed(reservation, trx);
          continue;
        }

        const reserved = await this.reservationService.markReserved(reservation, trx);

        await this.stockMovementRepository.createMovement(
          {
            productId: reservation.productId,
            movementType: StockMovementType.RESERVATION,
            quantity: reservation.quantity,
            referenceId: orderId,
            reason: `Stock reserved for order ${orderId}`,
          },
          trx,
        );

        succeeded.push({ reservation: reserved, inventory: attempt.inventory });
      }

      if (shortage) {
        for (const { reservation } of succeeded) {
          await this._retryOptimistic(async () => {
            const current = await this._requireInventory(reservation.productId, trx);

            return this.inventoryRepository.optimisticUpdate(
              current.id,
              {
                availableQuantity: current.availableQuantity + reservation.quantity,
                reservedQuantity: current.reservedQuantity - reservation.quantity,
                expectedVersion: current.version,
              },
              trx,
            );
          });

          await this.stockMovementRepository.createMovement(
            {
              productId: reservation.productId,
              movementType: StockMovementType.RELEASE,
              quantity: reservation.quantity,
              referenceId: orderId,
              reason: `Order ${orderId} could not be fully reserved (insufficient stock for product ${shortage.productId}) — releasing partial reservation`,
            },
            trx,
          );

          await this.reservationService.markReleased(reservation, trx);
        }

        await this.outboxService.addEvent(
          InventoryReservationFailed.build({ orderId, items, shortage }),
          trx,
        );

        return { success: false, shortage };
      }

      await this.outboxService.addEvent(
        InventoryReserved.build({
          orderId,
          items: succeeded.map(({ reservation }) => ({
            productId: reservation.productId,
            quantity: reservation.quantity,
          })),
        }),
        trx,
      );

      for (const { inventory } of succeeded) {
        await this._maybePublishLowStock(inventory, trx);
      }

      return { success: true, reservations: succeeded.map(({ reservation }) => reservation) };
    });
  }

  // Releases every RESERVED reservation for an order (OrderCancelledConsumer,
  // or an expiry sweep) — returns their stock to available.
  async releaseReservation({ orderId }, tx = null) {
    return this._withTransaction(tx, async (trx) => {
      const reservations = await this.reservationService.getByOrderId(orderId, trx);

      const releasable = reservations.filter(
        (reservation) => reservation.status === ReservationStatus.RESERVED,
      );

      if (releasable.length === 0) {
        return { released: [] };
      }

      const released = [];

      for (const reservation of releasable) {
        const updated = await this._retryOptimistic(async () => {
          const current = await this._requireInventory(reservation.productId, trx);

          if (current.reservedQuantity < reservation.quantity) {
            throw new ConflictError(
              `Cannot release ${reservation.quantity} units for product ${reservation.productId}: only ${current.reservedQuantity} reserved`,
            );
          }

          return this.inventoryRepository.optimisticUpdate(
            current.id,
            {
              availableQuantity: current.availableQuantity + reservation.quantity,
              reservedQuantity: current.reservedQuantity - reservation.quantity,
              expectedVersion: current.version,
            },
            trx,
          );
        });

        await this.stockMovementRepository.createMovement(
          {
            productId: reservation.productId,
            movementType: StockMovementType.RELEASE,
            quantity: reservation.quantity,
            referenceId: orderId,
            reason: `Reservation released for order ${orderId}`,
          },
          trx,
        );

        await this.reservationService.markReleased(reservation, trx);

        released.push({ productId: reservation.productId, quantity: reservation.quantity, inventory: updated });
      }

      await this.outboxService.addEvent(
        InventoryReleased.build({
          orderId,
          items: released.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        }),
        trx,
      );

      return { released };
    });
  }

  // Permanently consumes reserved stock once an order is confirmed
  // (payment/fulfillment succeeded). Available is untouched — the stock
  // already left the sellable pool the moment it was reserved.
  async confirmReservation({ orderId }, tx = null) {
    return this._withTransaction(tx, async (trx) => {
      const reservations = await this.reservationService.getByOrderId(orderId, trx);

      const confirmable = reservations.filter(
        (reservation) => reservation.status === ReservationStatus.RESERVED,
      );

      if (confirmable.length === 0) {
        return { confirmed: [] };
      }

      const confirmed = [];

      for (const reservation of confirmable) {
        const updated = await this._retryOptimistic(async () => {
          const current = await this._requireInventory(reservation.productId, trx);

          if (current.reservedQuantity < reservation.quantity) {
            throw new ConflictError(
              `Cannot confirm ${reservation.quantity} units for product ${reservation.productId}: only ${current.reservedQuantity} reserved`,
            );
          }

          return this.inventoryRepository.decrementReserved(
            current.id,
            reservation.quantity,
            current.version,
            trx,
          );
        });

        await this.stockMovementRepository.createMovement(
          {
            productId: reservation.productId,
            movementType: StockMovementType.CONFIRMATION,
            quantity: reservation.quantity,
            referenceId: orderId,
            reason: `Reservation confirmed for order ${orderId}`,
          },
          trx,
        );

        await this.reservationService.markConfirmed(reservation, trx);

        confirmed.push({ productId: reservation.productId, quantity: reservation.quantity, inventory: updated });
      }

      return { confirmed };
    });
  }

  async adjustStock({ productId, quantityDelta, reason }, tx = null) {
    if (!Number.isInteger(quantityDelta) || quantityDelta === 0) {
      throw new BadRequestError("quantityDelta must be a non-zero integer");
    }

    return this._withTransaction(tx, async (trx) => {
      const updated = await this._retryOptimistic(async () => {
        const current = await this._requireInventory(productId, trx);

        if (quantityDelta < 0 && current.availableQuantity < Math.abs(quantityDelta)) {
          throw new ConflictError(
            `Cannot adjust product ${productId} by ${quantityDelta}: only ${current.availableQuantity} available`,
          );
        }

        return quantityDelta > 0
          ? this.inventoryRepository.incrementAvailable(current.id, quantityDelta, current.version, trx)
          : this.inventoryRepository.decrementAvailable(current.id, Math.abs(quantityDelta), current.version, trx);
      });

      await this.stockMovementRepository.createMovement(
        {
          productId,
          movementType: StockMovementType.ADJUSTMENT,
          quantity: Math.abs(quantityDelta),
          referenceId: null,
          reason: reason || "Manual stock adjustment",
        },
        trx,
      );

      await this.outboxService.addEvent(
        InventoryAdjusted.build({
          productId,
          movementType: StockMovementType.ADJUSTMENT,
          quantity: Math.abs(quantityDelta),
          availableQuantity: updated.availableQuantity,
          reservedQuantity: updated.reservedQuantity,
        }),
        trx,
      );

      if (quantityDelta < 0) {
        await this._maybePublishLowStock(updated, trx);
      }

      return updated;
    });
  }

  async increaseStock({ productId, quantity, reason }, tx = null) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestError("quantity must be a positive integer");
    }

    return this._withTransaction(tx, async (trx) => {
      const updated = await this._retryOptimistic(async () => {
        const current = await this._requireInventory(productId, trx);

        return this.inventoryRepository.incrementAvailable(current.id, quantity, current.version, trx);
      });

      await this.stockMovementRepository.createMovement(
        {
          productId,
          movementType: StockMovementType.INCREASE,
          quantity,
          referenceId: null,
          reason: reason || "Manual stock increase",
        },
        trx,
      );

      await this.outboxService.addEvent(
        InventoryAdjusted.build({
          productId,
          movementType: StockMovementType.INCREASE,
          quantity,
          availableQuantity: updated.availableQuantity,
          reservedQuantity: updated.reservedQuantity,
        }),
        trx,
      );

      return updated;
    });
  }

  async decreaseStock({ productId, quantity, reason }, tx = null) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestError("quantity must be a positive integer");
    }

    return this._withTransaction(tx, async (trx) => {
      const updated = await this._retryOptimistic(async () => {
        const current = await this._requireInventory(productId, trx);

        if (current.availableQuantity < quantity) {
          throw new ConflictError(
            `Insufficient available stock for product ${productId}: requested ${quantity}, available ${current.availableQuantity}`,
          );
        }

        return this.inventoryRepository.decrementAvailable(current.id, quantity, current.version, trx);
      });

      await this.stockMovementRepository.createMovement(
        {
          productId,
          movementType: StockMovementType.DECREASE,
          quantity,
          referenceId: null,
          reason: reason || "Manual stock decrease",
        },
        trx,
      );

      await this.outboxService.addEvent(
        InventoryAdjusted.build({
          productId,
          movementType: StockMovementType.DECREASE,
          quantity,
          availableQuantity: updated.availableQuantity,
          reservedQuantity: updated.reservedQuantity,
        }),
        trx,
      );

      await this._maybePublishLowStock(updated, trx);

      return updated;
    });
  }

  async getAvailability(productId) {
    return this._requireInventory(productId, null);
  }

  async checkAvailability(productId, quantity) {
    const inventory = await this.inventoryRepository.findByProductId(productId);

    if (!inventory) {
      return false;
    }

    return inventory.availableQuantity >= quantity;
  }

  // Takes a product off-sale by zeroing its available stock. Reserved stock
  // (orders already in flight) is left untouched — those reservations still
  // run their normal confirm/release/expire lifecycle independently.
  async archiveInventory(productId, tx = null) {
    return this._withTransaction(tx, async (trx) => {
      let zeroedAmount = 0;

      const updated = await this._retryOptimistic(async () => {
        const current = await this._requireInventory(productId, trx);

        if (current.availableQuantity === 0) {
          zeroedAmount = 0;
          return current;
        }

        zeroedAmount = current.availableQuantity;

        return this.inventoryRepository.decrementAvailable(
          current.id,
          current.availableQuantity,
          current.version,
          trx,
        );
      });

      if (zeroedAmount > 0) {
        await this.stockMovementRepository.createMovement(
          {
            productId,
            movementType: StockMovementType.ADJUSTMENT,
            quantity: zeroedAmount,
            referenceId: null,
            reason: "Inventory archived — available stock zeroed",
          },
          trx,
        );

        await this.outboxService.addEvent(
          InventoryAdjusted.build({
            productId,
            movementType: StockMovementType.ADJUSTMENT,
            quantity: zeroedAmount,
            availableQuantity: updated.availableQuantity,
            reservedQuantity: updated.reservedQuantity,
          }),
          trx,
        );
      }

      return updated;
    });
  }

  async getHistory(productId, { page, limit, sortDir, movementType }) {
    return this.stockMovementRepository.findProductHistory({
      productId,
      page,
      limit,
      sortDir,
      movementType,
    });
  }

  async getReservations(productId, { status, page, limit }) {
    return this.reservationService.getProductReservations({ productId, status, page, limit });
  }

  async searchLowStock({ page, limit, sortDir }) {
    return this.inventoryRepository.findLowStock({
      threshold: LOW_STOCK_THRESHOLD,
      page,
      limit,
      sortDir,
    });
  }
}

module.exports = InventoryService;
