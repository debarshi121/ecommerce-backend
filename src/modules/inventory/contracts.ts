// src/modules/inventory/contracts.ts

import type { MaybeTransaction } from "../../shared/types/database";
import type {
  InventoryRow,
  ReservationRow,
  StockMovementRow,
} from "../../shared/types/entities";
import type { Page, SortDirection } from "../../shared/types/pagination";
import type { ReservationStatusValue } from "./constants/ReservationStatus";
import type { StockMovementTypeValue } from "./constants/StockMovementType";

/*
|--------------------------------------------------------------------------
| Repository ports
|--------------------------------------------------------------------------
*/

export interface CreateInventoryInput {
  productId: string;
  availableQuantity?: number;
  reservedQuantity?: number;
}

export interface AbsoluteQuantities {
  availableQuantity: number;
  reservedQuantity: number;
}

/** Absolute counter write, gated on the version the caller last read. */
export interface OptimisticUpdateInput extends AbsoluteQuantities {
  expectedVersion: number;
}

export interface LowStockQuery {
  threshold: number;
  page: number;
  limit: number;
  sortDir?: SortDirection;
}

/**
 * Every mutating method returns `InventoryRow | null`, where `null` means
 * "the guard in the WHERE clause did not hold" — a stale version, or a
 * counter that would have gone negative. Callers re-read and retry rather
 * than catching an exception.
 */
export interface IInventoryRepository {
  createInventory(
    input: CreateInventoryInput,
    tx?: MaybeTransaction,
  ): Promise<InventoryRow>;
  findByProductId(
    productId: string,
    tx?: MaybeTransaction,
  ): Promise<InventoryRow | null>;
  findById(id: string, tx?: MaybeTransaction): Promise<InventoryRow | null>;
  exists(productId: string, tx?: MaybeTransaction): Promise<boolean>;
  updateStock(
    id: string,
    quantities: AbsoluteQuantities,
    tx?: MaybeTransaction,
  ): Promise<InventoryRow | null>;
  optimisticUpdate(
    id: string,
    input: OptimisticUpdateInput,
    tx?: MaybeTransaction,
  ): Promise<InventoryRow | null>;
  incrementAvailable(
    id: string,
    amount: number,
    expectedVersion: number,
    tx?: MaybeTransaction,
  ): Promise<InventoryRow | null>;
  decrementAvailable(
    id: string,
    amount: number,
    expectedVersion: number,
    tx?: MaybeTransaction,
  ): Promise<InventoryRow | null>;
  incrementReserved(
    id: string,
    amount: number,
    expectedVersion: number,
    tx?: MaybeTransaction,
  ): Promise<InventoryRow | null>;
  decrementReserved(
    id: string,
    amount: number,
    expectedVersion: number,
    tx?: MaybeTransaction,
  ): Promise<InventoryRow | null>;
  findLowStock(
    query: LowStockQuery,
    tx?: MaybeTransaction,
  ): Promise<Page<InventoryRow>>;
}

export interface CreateReservationInput {
  orderId: string;
  productId: string;
  quantity: number;
  status: ReservationStatusValue;
}

export interface ReservationStatusExtra {
  expiresAt?: Date | null;
}

export interface ProductReservationsQuery {
  productId: string;
  status?: ReservationStatusValue;
  page: number;
  limit: number;
}

export interface IReservationRepository {
  create(
    input: CreateReservationInput,
    tx?: MaybeTransaction,
  ): Promise<ReservationRow>;
  updateStatus(
    id: string,
    status: ReservationStatusValue,
    extra?: ReservationStatusExtra,
    tx?: MaybeTransaction,
  ): Promise<ReservationRow | null>;
  findById(id: string, tx?: MaybeTransaction): Promise<ReservationRow | null>;
  findByOrderId(
    orderId: string,
    tx?: MaybeTransaction,
  ): Promise<ReservationRow[]>;
  findProductReservations(
    query: ProductReservationsQuery,
    tx?: MaybeTransaction,
  ): Promise<Page<ReservationRow>>;
  findPendingExpired(
    limit?: number,
    tx?: MaybeTransaction,
  ): Promise<ReservationRow[]>;
  delete(id: string, tx?: MaybeTransaction): Promise<void>;
}

export interface CreateStockMovementInput {
  productId: string;
  movementType: StockMovementTypeValue;
  quantity: number;
  referenceId?: string | null;
  reason?: string | null;
}

export interface StockHistoryQuery {
  page: number;
  limit: number;
  sortDir?: SortDirection;
}

export interface ProductStockHistoryQuery extends StockHistoryQuery {
  productId: string;
  movementType?: StockMovementTypeValue;
}

export interface IStockMovementRepository {
  createMovement(
    input: CreateStockMovementInput,
    tx?: MaybeTransaction,
  ): Promise<StockMovementRow>;
  findHistory(
    query: StockHistoryQuery,
    tx?: MaybeTransaction,
  ): Promise<Page<StockMovementRow>>;
  findProductHistory(
    query: ProductStockHistoryQuery,
    tx?: MaybeTransaction,
  ): Promise<Page<StockMovementRow>>;
}

/*
|--------------------------------------------------------------------------
| Reservation service port
|--------------------------------------------------------------------------
*/

export interface CreatePendingReservation {
  orderId: string;
  productId: string;
  quantity: number;
}

export interface IReservationService {
  createPending(
    input: CreatePendingReservation,
    tx?: MaybeTransaction,
  ): Promise<ReservationRow>;
  markReserved(
    reservation: ReservationRow,
    tx?: MaybeTransaction,
  ): Promise<ReservationRow | null>;
  markFailed(
    reservation: ReservationRow,
    tx?: MaybeTransaction,
  ): Promise<ReservationRow | null>;
  markReleased(
    reservation: ReservationRow,
    tx?: MaybeTransaction,
  ): Promise<ReservationRow | null>;
  markConfirmed(
    reservation: ReservationRow,
    tx?: MaybeTransaction,
  ): Promise<ReservationRow | null>;
  markExpired(
    reservation: ReservationRow,
    tx?: MaybeTransaction,
  ): Promise<ReservationRow | null>;
  getByOrderId(
    orderId: string,
    tx?: MaybeTransaction,
  ): Promise<ReservationRow[]>;
  getProductReservations(
    query: ProductReservationsQuery,
    tx?: MaybeTransaction,
  ): Promise<Page<ReservationRow>>;
  findExpired(limit?: number, tx?: MaybeTransaction): Promise<ReservationRow[]>;
}

/*
|--------------------------------------------------------------------------
| Inventory service commands and results
|--------------------------------------------------------------------------
*/

export interface OrderLineItem {
  productId: string;
  quantity: number;
}

export interface ReserveStockCommand {
  orderId: string;
  items: OrderLineItem[];
}

/** Why a reservation attempt could not allocate stock. */
export type ShortageReason = "INVENTORY_NOT_FOUND" | "INSUFFICIENT_STOCK";

export interface ReservationShortage {
  productId: string;
  reason: ShortageReason;
  requested: number;
  available: number;
}

/**
 * A single-line reserve attempt. The discriminated union is what stops the
 * caller reading `inventory` on a failure or `reason` on a success.
 */
export type ReserveAttempt =
  | { ok: true; inventory: InventoryRow }
  | { ok: false; reason: ShortageReason; available: number };

/**
 * All-or-nothing outcome for a whole order: either every line is reserved,
 * or none is and `shortage` says which line broke it.
 */
export type ReserveStockResult =
  | { success: true; reservations: ReservationRow[] }
  | { success: false; shortage: ReservationShortage };

export interface ReleasedLine {
  productId: string;
  quantity: number;
  inventory: InventoryRow;
}

export interface ReleaseReservationResult {
  released: ReleasedLine[];
}

export interface ConfirmReservationResult {
  confirmed: ReleasedLine[];
}

export interface AdjustStockCommand {
  productId: string;
  quantityDelta: number;
  reason?: string | null;
}

export interface StockQuantityCommand {
  productId: string;
  quantity: number;
  reason?: string | null;
}

export interface CreateInventoryCommand {
  productId: string;
}

/*
|--------------------------------------------------------------------------
| Integration event payloads
|--------------------------------------------------------------------------
*/

/** Published by the (future) Ordering module, consumed here. */
export interface OrderCreatedPayload {
  orderId: string;
  items: OrderLineItem[];
}

export interface OrderCancelledPayload {
  orderId: string;
}

export interface InventoryReservedPayload {
  orderId: string;
  items: OrderLineItem[];
}

export interface InventoryReleasedPayload {
  orderId: string;
  items: OrderLineItem[];
}

export interface InventoryReservationFailedPayload {
  orderId: string;
  items: OrderLineItem[];
  shortage: ReservationShortage;
}

export interface InventoryAdjustedPayload {
  productId: string;
  movementType: StockMovementTypeValue;
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
}

export interface InventoryLowPayload {
  productId: string;
  availableQuantity: number;
  threshold: number;
}
