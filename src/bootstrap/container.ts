// src/bootstrap/container.ts

import type { EventPublisher } from "../infrastructure/eventbus/EventPublisher";
import type { PublishOutboxJob } from "../jobs/PublishOutboxJob";
import type { BrandController } from "../modules/catalog/controllers/BrandController";
import type { CategoryController } from "../modules/catalog/controllers/CategoryController";
import type { ProductController } from "../modules/catalog/controllers/ProductController";
import type { BrandService } from "../modules/catalog/services/BrandService";
import type { CategoryService } from "../modules/catalog/services/CategoryService";
import type { ProductService } from "../modules/catalog/services/ProductService";
import type { AuthController } from "../modules/identity/controllers/AuthController";
import type { OtpController } from "../modules/identity/controllers/OtpController";
import type { PermissionController } from "../modules/identity/controllers/PermissionController";
import type { RoleController } from "../modules/identity/controllers/RoleController";
import type { SessionController } from "../modules/identity/controllers/SessionController";
import type { JwtMiddleware } from "../modules/identity/middleware/JwtMiddleware";
import type { PermissionMiddleware } from "../modules/identity/middleware/PermissionMiddleware";
import type {
  IOtpService,
  ISessionService,
} from "../modules/identity/contracts";
import type { AuthService } from "../modules/identity/services/AuthService";
import type { PermissionService } from "../modules/identity/services/PermissionService";
import type { RoleService } from "../modules/identity/services/RoleService";
import type { OrderCancelledConsumer } from "../modules/inventory/consumers/OrderCancelledConsumer";
import type { OrderCreatedConsumer } from "../modules/inventory/consumers/OrderCreatedConsumer";
import type { ProductCreatedConsumer } from "../modules/inventory/consumers/ProductCreatedConsumer";
import type { InventoryController } from "../modules/inventory/controllers/InventoryController";
import type { IReservationService } from "../modules/inventory/contracts";
import type { InventoryService } from "../modules/inventory/services/InventoryService";
import type { UserRegisteredConsumer } from "../modules/notification/consumers/UserRegisteredConsumer";
import type { INotificationService } from "../modules/notification/contracts";
import type { IInboxService } from "../shared/contracts";
import type { OutboxWorker } from "../workers/OutboxWorker";

/**
 * The composed application graph.
 *
 * Everything is wired once in `registerDependencies()` and passed down from
 * there — no module reaches for a global. Consumers of the container take a
 * `Pick<>` of exactly what they need (see each module's route dependencies),
 * so a route group cannot quietly start using a service it never declared.
 */
export interface AppContainer {
  /* Controllers */
  authController: AuthController;
  otpController: OtpController;
  sessionController: SessionController;
  roleController: RoleController;
  permissionController: PermissionController;
  productController: ProductController;
  categoryController: CategoryController;
  brandController: BrandController;
  inventoryController: InventoryController;

  /* Middleware */
  jwtMiddleware: JwtMiddleware;
  permissionMiddleware: PermissionMiddleware;

  /* Services */
  authService: AuthService;
  sessionService: ISessionService;
  otpService: IOtpService;
  roleService: RoleService;
  permissionService: PermissionService;
  notificationService: INotificationService;
  productService: ProductService;
  categoryService: CategoryService;
  brandService: BrandService;
  inventoryService: InventoryService;
  reservationService: IReservationService;

  /* Consumers */
  userRegisteredConsumer: UserRegisteredConsumer;
  productCreatedConsumer: ProductCreatedConsumer;
  orderCreatedConsumer: OrderCreatedConsumer;
  orderCancelledConsumer: OrderCancelledConsumer;

  /* Event bus */
  eventPublisher: EventPublisher;
  inboxService: IInboxService;

  /* Jobs */
  publishOutboxJob: PublishOutboxJob;

  /* Workers */
  outboxWorker: OutboxWorker;
}
