// src/modules/inventory/services/InventoryService.ts

import type { IOutboxService } from "../../../shared/contracts";
import { BadRequestError } from "../../../shared/errors/BadRequestError";
import { ConflictError } from "../../../shared/errors/ConflictError";
import { NotFoundError } from "../../../shared/errors/NotFoundError";
import type {
  ITransactionManager,
  MaybeTransaction,
  Transaction,
} from "../../../shared/types/database";
import type {
  InventoryRow,
  ReservationRow,
  StockMovementRow,
} from "../../../shared/types/entities";
import type { Page } from "../../../shared/types/pagination";

import { ReservationStatus } from "../constants/ReservationStatus";
import { StockMovementType } from "../constants/StockMovementType";
import type {
  AdjustStockCommand,
  ConfirmReservationResult,
  CreateInventoryCommand,
  IInventoryRepository,
  IReservationService,
  IStockMovementRepository,
  LowStockQuery,
  OrderLineItem,
  ProductReservationsQuery,
  ProductStockHistoryQuery,
  ReleasedLine,
  ReleaseReservationResult,
  ReservationShortage,
  ReserveAttempt,
  ReserveStockCommand,
  ReserveStockResult,
  StockQuantityCommand,
} from "../contracts";
import { InventoryAdjusted } from "../events/InventoryAdjusted";
import { InventoryLow } from "../events/InventoryLow";
import { InventoryReleased } from "../events/InventoryReleased";
import { InventoryReservationFailed } from "../events/InventoryReservationFailed";
import { InventoryReserved } from "../events/InventoryReserved";

// A losing optimistic writer simply re-reads and retries — under READ
// COMMITTED every retry's SELECT sees the latest committed version, so a
// small, bounded number of attempts is enough to converge even under heavy
// contention on a single hot product row.
const MAX_OPTIMISTIC_RETRIES = 5;

// Not part of the requested `inventory` schema (which is deliberately just
// id/productId/availableQuantity/reservedQuantity/version/timestamps), so
// this stays a single global threshold rather than a per-row column. A
// per-product threshold is a natural follow-up (see docs).
const LOW_STOCK_THRESHOLD = Number(
  process.env.INVENTORY_LOW_STOCK_THRESHOLD || 10,
);

export interface InventoryServiceDependencies {
  inventoryRepository: IInventoryRepository;
  reservationService: IReservationService;
  stockMovementRepository: IStockMovementRepository;
  outboxService: IOutboxService;
  transactionManager: ITransactionManager;
}

export class InventoryService {
  private readonly inventoryRepository: IInventoryRepository;

  private readonly reservationService: IReservationService;

  private readonly stockMovementRepository: IStockMovementRepository;

  private readonly outboxService: IOutboxService;

  private readonly transactionManager: ITransactionManager;

  constructor({
    inventoryRepository,
    reservationService,
    stockMovementRepository,
    outboxService,
    transactionManager,
  }: InventoryServiceDependencies) {
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
  private async withTransaction<T>(
    tx: MaybeTransaction,
    run: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    if (tx) {
      return run(tx);
    }

    return this.transactionManager.execute(run);
  }

  private async requireInventory(
    productId: string,
    tx: MaybeTransaction,
  ): Promise<InventoryRow> {
    const inventory = await this.inventoryRepository.findByProductId(
      productId,
      tx,
    );

    if (!inventory) {
      throw new NotFoundError(`Inventory not found for product ${productId}`);
    }

    return inventory;
  }

  // Runs `attempt` until it returns a non-null row. `attempt` must re-read
  // the current row itself and either return the updated row, return null to
  // signal "version moved under me, retry", or throw for a genuine business
  // error (which propagates immediately, no retry).
  private async retryOptimistic(
    attempt: () => Promise<InventoryRow | null>,
  ): Promise<InventoryRow> {
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

  private async recordMovement(
    productId: string,
    movementType: StockMovementRow["movementType"],
    quantity: number,
    referenceId: string | null,
    reason: string,
    tx: Transaction,
  ): Promise<StockMovementRow> {
    return this.stockMovementRepository.createMovement(
      {
        productId,
        movementType,
        quantity,
        referenceId,
        reason,
      },
      tx,
    );
  }

  // Reservation has a genuine soft-fail branch (insufficient stock) that
  // must NOT be retried, so it gets its own loop instead of reusing
  // retryOptimistic (which only distinguishes "retry" from "throw").
  private async attemptReserve(
    reservation: ReservationRow,
    tx: Transaction,
  ): Promise<ReserveAttempt> {
    for (let i = 0; i < MAX_OPTIMISTIC_RETRIES; i += 1) {
      const current = await this.inventoryRepository.findByProductId(
        reservation.productId,
        tx,
      );

      if (!current) {
        return { ok: false, reason: "INVENTORY_NOT_FOUND", available: 0 };
      }

      if (current.availableQuantity < reservation.quantity) {
        return {
          ok: false,
          reason: "INSUFFICIENT_STOCK",
          available: current.availableQuantity,
        };
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

  private async maybePublishLowStock(
    inventory: InventoryRow,
    tx: Transaction,
  ): Promise<void> {
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

  /** Moves `quantity` units back from reserved to available. */
  private async returnToAvailable(
    productId: string,
    quantity: number,
    tx: Transaction,
  ): Promise<InventoryRow> {
    return this.retryOptimistic(async () => {
      const current = await this.requireInventory(productId, tx);

      return this.inventoryRepository.optimisticUpdate(
        current.id,
        {
          availableQuantity: current.availableQuantity + quantity,
          reservedQuantity: current.reservedQuantity - quantity,
          expectedVersion: current.version,
        },
        tx,
      );
    });
  }

  private assertOrderItems(items: OrderLineItem[]): void {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestError("items must be a non-empty array");
    }

    items.forEach((item) => {
      if (
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new BadRequestError(
          "each item requires a productId and a positive integer quantity",
        );
      }
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Business methods
  |--------------------------------------------------------------------------
  */

  async createInventory(
    { productId }: CreateInventoryCommand,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow> {
    return this.withTransaction(tx, async (trx) => {
      const alreadyExists = await this.inventoryRepository.exists(
        productId,
        trx,
      );

      if (alreadyExists) {
        throw new ConflictError(
          `Inventory already exists for product ${productId}`,
        );
      }

      const inventory = await this.inventoryRepository.createInventory(
        { productId, availableQuantity: 0, reservedQuantity: 0 },
        trx,
      );

      await this.recordMovement(
        productId,
        StockMovementType.INITIAL,
        0,
        null,
        "Inventory record created for new product",
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
  async reserveStock(
    { orderId, items }: ReserveStockCommand,
    tx: MaybeTransaction = null,
  ): Promise<ReserveStockResult> {
    this.assertOrderItems(items);

    return this.withTransaction(tx, async (trx) => {
      const pending: ReservationRow[] = [];

      for (const item of items) {
        const reservation = await this.reservationService.createPending(
          { orderId, productId: item.productId, quantity: item.quantity },
          trx,
        );

        pending.push(reservation);
      }

      const succeeded: {
        reservation: ReservationRow;
        inventory: InventoryRow;
      }[] = [];

      let shortage: ReservationShortage | null = null;

      for (const reservation of pending) {
        if (shortage) {
          await this.reservationService.markFailed(reservation, trx);
          continue;
        }

        const attempt = await this.attemptReserve(reservation, trx);

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

        const reserved = await this.reservationService.markReserved(
          reservation,
          trx,
        );

        await this.recordMovement(
          reservation.productId,
          StockMovementType.RESERVATION,
          reservation.quantity,
          orderId,
          `Stock reserved for order ${orderId}`,
          trx,
        );

        succeeded.push({
          reservation: reserved ?? reservation,
          inventory: attempt.inventory,
        });
      }

      if (shortage) {
        for (const { reservation } of succeeded) {
          await this.returnToAvailable(
            reservation.productId,
            reservation.quantity,
            trx,
          );

          await this.recordMovement(
            reservation.productId,
            StockMovementType.RELEASE,
            reservation.quantity,
            orderId,
            `Order ${orderId} could not be fully reserved (insufficient stock for product ${shortage.productId}) — releasing partial reservation`,
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
        await this.maybePublishLowStock(inventory, trx);
      }

      return {
        success: true,
        reservations: succeeded.map(({ reservation }) => reservation),
      };
    });
  }

  // Releases every RESERVED reservation for an order (OrderCancelledConsumer,
  // or an expiry sweep) — returns their stock to available.
  async releaseReservation(
    { orderId }: { orderId: string },
    tx: MaybeTransaction = null,
  ): Promise<ReleaseReservationResult> {
    return this.withTransaction(tx, async (trx) => {
      const reservations = await this.reservationService.getByOrderId(
        orderId,
        trx,
      );

      const releasable = reservations.filter(
        (reservation) => reservation.status === ReservationStatus.RESERVED,
      );

      if (releasable.length === 0) {
        return { released: [] };
      }

      const released: ReleasedLine[] = [];

      for (const reservation of releasable) {
        const updated = await this.retryOptimistic(async () => {
          const current = await this.requireInventory(
            reservation.productId,
            trx,
          );

          if (current.reservedQuantity < reservation.quantity) {
            throw new ConflictError(
              `Cannot release ${reservation.quantity} units for product ${reservation.productId}: only ${current.reservedQuantity} reserved`,
            );
          }

          return this.inventoryRepository.optimisticUpdate(
            current.id,
            {
              availableQuantity:
                current.availableQuantity + reservation.quantity,
              reservedQuantity: current.reservedQuantity - reservation.quantity,
              expectedVersion: current.version,
            },
            trx,
          );
        });

        await this.recordMovement(
          reservation.productId,
          StockMovementType.RELEASE,
          reservation.quantity,
          orderId,
          `Reservation released for order ${orderId}`,
          trx,
        );

        await this.reservationService.markReleased(reservation, trx);

        released.push({
          productId: reservation.productId,
          quantity: reservation.quantity,
          inventory: updated,
        });
      }

      await this.outboxService.addEvent(
        InventoryReleased.build({
          orderId,
          items: released.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
        trx,
      );

      return { released };
    });
  }

  // Permanently consumes reserved stock once an order is confirmed
  // (payment/fulfillment succeeded). Available is untouched — the stock
  // already left the sellable pool the moment it was reserved.
  async confirmReservation(
    { orderId }: { orderId: string },
    tx: MaybeTransaction = null,
  ): Promise<ConfirmReservationResult> {
    return this.withTransaction(tx, async (trx) => {
      const reservations = await this.reservationService.getByOrderId(
        orderId,
        trx,
      );

      const confirmable = reservations.filter(
        (reservation) => reservation.status === ReservationStatus.RESERVED,
      );

      if (confirmable.length === 0) {
        return { confirmed: [] };
      }

      const confirmed: ReleasedLine[] = [];

      for (const reservation of confirmable) {
        const updated = await this.retryOptimistic(async () => {
          const current = await this.requireInventory(
            reservation.productId,
            trx,
          );

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

        await this.recordMovement(
          reservation.productId,
          StockMovementType.CONFIRMATION,
          reservation.quantity,
          orderId,
          `Reservation confirmed for order ${orderId}`,
          trx,
        );

        await this.reservationService.markConfirmed(reservation, trx);

        confirmed.push({
          productId: reservation.productId,
          quantity: reservation.quantity,
          inventory: updated,
        });
      }

      return { confirmed };
    });
  }

  async adjustStock(
    { productId, quantityDelta, reason }: AdjustStockCommand,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow> {
    if (!Number.isInteger(quantityDelta) || quantityDelta === 0) {
      throw new BadRequestError("quantityDelta must be a non-zero integer");
    }

    return this.withTransaction(tx, async (trx) => {
      const updated = await this.retryOptimistic(async () => {
        const current = await this.requireInventory(productId, trx);

        if (
          quantityDelta < 0 &&
          current.availableQuantity < Math.abs(quantityDelta)
        ) {
          throw new ConflictError(
            `Cannot adjust product ${productId} by ${quantityDelta}: only ${current.availableQuantity} available`,
          );
        }

        return quantityDelta > 0
          ? this.inventoryRepository.incrementAvailable(
              current.id,
              quantityDelta,
              current.version,
              trx,
            )
          : this.inventoryRepository.decrementAvailable(
              current.id,
              Math.abs(quantityDelta),
              current.version,
              trx,
            );
      });

      await this.recordMovement(
        productId,
        StockMovementType.ADJUSTMENT,
        Math.abs(quantityDelta),
        null,
        reason || "Manual stock adjustment",
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
        await this.maybePublishLowStock(updated, trx);
      }

      return updated;
    });
  }

  async increaseStock(
    { productId, quantity, reason }: StockQuantityCommand,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestError("quantity must be a positive integer");
    }

    return this.withTransaction(tx, async (trx) => {
      const updated = await this.retryOptimistic(async () => {
        const current = await this.requireInventory(productId, trx);

        return this.inventoryRepository.incrementAvailable(
          current.id,
          quantity,
          current.version,
          trx,
        );
      });

      await this.recordMovement(
        productId,
        StockMovementType.INCREASE,
        quantity,
        null,
        reason || "Manual stock increase",
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

  async decreaseStock(
    { productId, quantity, reason }: StockQuantityCommand,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestError("quantity must be a positive integer");
    }

    return this.withTransaction(tx, async (trx) => {
      const updated = await this.retryOptimistic(async () => {
        const current = await this.requireInventory(productId, trx);

        if (current.availableQuantity < quantity) {
          throw new ConflictError(
            `Insufficient available stock for product ${productId}: requested ${quantity}, available ${current.availableQuantity}`,
          );
        }

        return this.inventoryRepository.decrementAvailable(
          current.id,
          quantity,
          current.version,
          trx,
        );
      });

      await this.recordMovement(
        productId,
        StockMovementType.DECREASE,
        quantity,
        null,
        reason || "Manual stock decrease",
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

      await this.maybePublishLowStock(updated, trx);

      return updated;
    });
  }

  async getAvailability(productId: string): Promise<InventoryRow> {
    return this.requireInventory(productId, null);
  }

  async checkAvailability(
    productId: string,
    quantity: number,
  ): Promise<boolean> {
    const inventory =
      await this.inventoryRepository.findByProductId(productId);

    if (!inventory) {
      return false;
    }

    return inventory.availableQuantity >= quantity;
  }

  // Takes a product off-sale by zeroing its available stock. Reserved stock
  // (orders already in flight) is left untouched — those reservations still
  // run their normal confirm/release/expire lifecycle independently.
  async archiveInventory(
    productId: string,
    tx: MaybeTransaction = null,
  ): Promise<InventoryRow> {
    return this.withTransaction(tx, async (trx) => {
      let zeroedAmount = 0;

      const updated = await this.retryOptimistic(async () => {
        const current = await this.requireInventory(productId, trx);

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
        await this.recordMovement(
          productId,
          StockMovementType.ADJUSTMENT,
          zeroedAmount,
          null,
          "Inventory archived — available stock zeroed",
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

  async getHistory(
    productId: string,
    { page, limit, sortDir, movementType }: Omit<
      ProductStockHistoryQuery,
      "productId"
    >,
  ): Promise<Page<StockMovementRow>> {
    return this.stockMovementRepository.findProductHistory({
      productId,
      page,
      limit,
      ...(sortDir ? { sortDir } : {}),
      ...(movementType ? { movementType } : {}),
    });
  }

  async getReservations(
    productId: string,
    { status, page, limit }: Omit<ProductReservationsQuery, "productId">,
  ): Promise<Page<ReservationRow>> {
    return this.reservationService.getProductReservations({
      productId,
      ...(status ? { status } : {}),
      page,
      limit,
    });
  }

  async searchLowStock({
    page,
    limit,
    sortDir,
  }: Omit<LowStockQuery, "threshold">): Promise<Page<InventoryRow>> {
    return this.inventoryRepository.findLowStock({
      threshold: LOW_STOCK_THRESHOLD,
      page,
      limit,
      ...(sortDir ? { sortDir } : {}),
    });
  }
}
