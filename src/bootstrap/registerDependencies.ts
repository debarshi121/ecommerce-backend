// src/bootstrap/registerDependencies.ts

/*
|--------------------------------------------------------------------------
| Infrastructure
|--------------------------------------------------------------------------
*/

import { PostgresClient } from "../infrastructure/postgres/PostgresClient";
import { RabbitMQClient } from "../infrastructure/rabbitmq/RabbitMQClient";
import { RedisClient } from "../infrastructure/redis/RedisClient";
import { CacheService } from "../infrastructure/redis/CacheService";

import { PostgresTransactionManager } from "../infrastructure/postgres/PostgresTransactionManager";

import { EventPublisher } from "../infrastructure/eventbus/EventPublisher";

import { OtpStore } from "../modules/identity/stores/OtpStore";

/*
|--------------------------------------------------------------------------
| Repositories
|--------------------------------------------------------------------------
*/

import { UserRepository } from "../modules/identity/repositories/UserRepository";
import { SessionRepository } from "../modules/identity/repositories/SessionRepository";
import { RoleRepository } from "../modules/identity/repositories/RoleRepository";
import { PermissionRepository } from "../modules/identity/repositories/PermissionRepository";
import { OutboxRepository } from "../shared/repositories/OutboxRepository";
import { InboxRepository } from "../shared/repositories/InboxRepository";

import { ProductRepository } from "../modules/catalog/repositories/ProductRepository";
import { CategoryRepository } from "../modules/catalog/repositories/CategoryRepository";
import { BrandRepository } from "../modules/catalog/repositories/BrandRepository";

import { InventoryRepository } from "../modules/inventory/repositories/InventoryRepository";
import { ReservationRepository } from "../modules/inventory/repositories/ReservationRepository";
import { StockMovementRepository } from "../modules/inventory/repositories/StockMovementRepository";

/*
|--------------------------------------------------------------------------
| Services
|--------------------------------------------------------------------------
*/

import { CredentialService } from "../modules/identity/services/CredentialService";
import { TokenService } from "../modules/identity/services/TokenService";
import { TokenBlacklistService } from "../modules/identity/services/TokenBlacklistService";
import { SessionService } from "../modules/identity/services/SessionService";
import { OtpService } from "../modules/identity/services/OtpService";
import { AuthService } from "../modules/identity/services/AuthService";
import { RoleService } from "../modules/identity/services/RoleService";
import { PermissionService } from "../modules/identity/services/PermissionService";
import { OutboxService } from "../shared/services/OutboxService";
import { InboxService } from "../shared/services/InboxService";
import { EventBusService } from "../shared/services/EventBusService";
import { EmailService } from "../modules/notification/services/EmailService";
import { NotificationService } from "../modules/notification/services/NotificationService";

import { ProductService } from "../modules/catalog/services/ProductService";
import { CategoryService } from "../modules/catalog/services/CategoryService";
import { BrandService } from "../modules/catalog/services/BrandService";

import { InventoryService } from "../modules/inventory/services/InventoryService";
import { ReservationService } from "../modules/inventory/services/ReservationService";

/*
|--------------------------------------------------------------------------
| Providers
|--------------------------------------------------------------------------
*/

import { PasswordAuthenticationProvider } from "../modules/identity/providers/PasswordAuthenticationProvider";
import { OtpAuthenticationProvider } from "../modules/identity/providers/OtpAuthenticationProvider";
import { AuthenticationProviderFactory } from "../modules/identity/providers/AuthenticationProviderFactory";
import { ConsoleEmailProvider } from "../modules/notification/providers/ConsoleEmailProvider";

/*
|--------------------------------------------------------------------------
| Consumers
|--------------------------------------------------------------------------
*/

import { UserRegisteredConsumer } from "../modules/notification/consumers/UserRegisteredConsumer";

import { ProductCreatedConsumer } from "../modules/inventory/consumers/ProductCreatedConsumer";
import { OrderCreatedConsumer } from "../modules/inventory/consumers/OrderCreatedConsumer";
import { OrderCancelledConsumer } from "../modules/inventory/consumers/OrderCancelledConsumer";

/*
|--------------------------------------------------------------------------
| Controllers
|--------------------------------------------------------------------------
*/

import { AuthController } from "../modules/identity/controllers/AuthController";
import { OtpController } from "../modules/identity/controllers/OtpController";
import { SessionController } from "../modules/identity/controllers/SessionController";
import { RoleController } from "../modules/identity/controllers/RoleController";
import { PermissionController } from "../modules/identity/controllers/PermissionController";

import { ProductController } from "../modules/catalog/controllers/ProductController";
import { CategoryController } from "../modules/catalog/controllers/CategoryController";
import { BrandController } from "../modules/catalog/controllers/BrandController";

import { InventoryController } from "../modules/inventory/controllers/InventoryController";

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

import { JwtMiddleware } from "../modules/identity/middleware/JwtMiddleware";
import { PermissionMiddleware } from "../modules/identity/middleware/PermissionMiddleware";

/*
|--------------------------------------------------------------------------
| Jobs and workers
|--------------------------------------------------------------------------
*/

import { PublishOutboxJob } from "../jobs/PublishOutboxJob";
import { OutboxWorker } from "../workers/OutboxWorker";

import type { AppContainer } from "./container";

/**
 * Composition root: the single place that knows which concrete class
 * implements which port. Constructed in dependency order — infrastructure,
 * repositories, services, then the delivery layer on top.
 */
export function registerDependencies(): AppContainer {
  /*
  |--------------------------------------------------------------------------
  | Infrastructure
  |--------------------------------------------------------------------------
  */

  const db = PostgresClient.getInstance();

  const rabbit = RabbitMQClient.getInstance();

  const redis = RedisClient.getInstance();

  const cacheService = new CacheService(redis);

  const otpStore = new OtpStore(cacheService);

  const transactionManager = new PostgresTransactionManager(db);

  const eventPublisher = new EventPublisher(rabbit);

  /*
  |--------------------------------------------------------------------------
  | Repositories
  |--------------------------------------------------------------------------
  */

  const userRepository = new UserRepository(db);

  const sessionRepository = new SessionRepository(db);

  const roleRepository = new RoleRepository(db);

  const permissionRepository = new PermissionRepository(db);

  const outboxRepository = new OutboxRepository(db);

  const inboxRepository = new InboxRepository(db);

  const productRepository = new ProductRepository(db);

  const categoryRepository = new CategoryRepository(db);

  const brandRepository = new BrandRepository(db);

  const inventoryRepository = new InventoryRepository(db);

  const reservationRepository = new ReservationRepository(db);

  const stockMovementRepository = new StockMovementRepository(db);

  /*
  |--------------------------------------------------------------------------
  | Services
  |--------------------------------------------------------------------------
  */

  const credentialService = new CredentialService(userRepository);

  const tokenService = new TokenService();

  const tokenBlacklistService = new TokenBlacklistService({
    cacheService,
  });

  const otpService = new OtpService({
    otpStore,
    eventPublisher,
  });

  const sessionService = new SessionService({
    sessionRepository,
    tokenService,
    transactionManager,
  });

  const roleService = new RoleService({
    roleRepository,
    permissionRepository,
  });

  const permissionService = new PermissionService(permissionRepository);

  const outboxService = new OutboxService({
    outboxRepository,
  });

  const inboxService = new InboxService({
    inboxRepository,
    transactionManager,
  });

  const eventBusService = new EventBusService({
    eventPublisher,
  });

  const passwordProvider = new PasswordAuthenticationProvider(
    credentialService,
  );

  const otpProvider = new OtpAuthenticationProvider(userRepository, otpService);

  const authenticationProviderFactory = new AuthenticationProviderFactory({
    passwordProvider,
    otpProvider,
  });

  const authService = new AuthService({
    userRepository,
    credentialService,
    tokenService,
    sessionService,
    transactionManager,
    outboxService,
    tokenBlacklistService,
    otpService,
    authenticationProviderFactory,
  });

  const emailProvider = new ConsoleEmailProvider();

  const emailService = new EmailService({
    emailProvider,
  });

  const notificationService = new NotificationService({
    emailService,
  });

  const categoryService = new CategoryService({
    categoryRepository,
  });

  const brandService = new BrandService({
    brandRepository,
  });

  const productService = new ProductService({
    productRepository,
    categoryRepository,
    brandRepository,
    outboxService,
    transactionManager,
  });

  const reservationService = new ReservationService({
    reservationRepository,
  });

  const inventoryService = new InventoryService({
    inventoryRepository,
    reservationService,
    stockMovementRepository,
    outboxService,
    transactionManager,
  });

  /*
  |--------------------------------------------------------------------------
  | Consumers
  |--------------------------------------------------------------------------
  */

  const userRegisteredConsumer = new UserRegisteredConsumer({
    notificationService,
  });

  const productCreatedConsumer = new ProductCreatedConsumer({
    inventoryService,
  });

  const orderCreatedConsumer = new OrderCreatedConsumer({
    inventoryService,
  });

  const orderCancelledConsumer = new OrderCancelledConsumer({
    inventoryService,
  });

  /*
  |--------------------------------------------------------------------------
  | Controllers
  |--------------------------------------------------------------------------
  */

  const authController = new AuthController(authService);

  const otpController = new OtpController(otpService);

  const sessionController = new SessionController(authService);

  const roleController = new RoleController(roleService);

  const permissionController = new PermissionController(permissionService);

  const productController = new ProductController(productService);

  const categoryController = new CategoryController(categoryService);

  const brandController = new BrandController(brandService);

  const inventoryController = new InventoryController(inventoryService);

  /*
  |--------------------------------------------------------------------------
  | Middleware
  |--------------------------------------------------------------------------
  */

  const jwtMiddleware = new JwtMiddleware({
    tokenService,
    userRepository,
    tokenBlacklistService,
  });

  const permissionMiddleware = new PermissionMiddleware({
    userRepository,
  });

  /*
  |--------------------------------------------------------------------------
  | Jobs
  |--------------------------------------------------------------------------
  */

  const publishOutboxJob = new PublishOutboxJob({
    outboxService,
    eventBusService,
  });

  /*
  |--------------------------------------------------------------------------
  | Workers
  |--------------------------------------------------------------------------
  */

  const outboxWorker = new OutboxWorker({
    publishOutboxJob,
  });

  return {
    // Controllers
    authController,
    otpController,
    sessionController,
    roleController,
    permissionController,
    productController,
    categoryController,
    brandController,
    inventoryController,

    // Middleware
    jwtMiddleware,
    permissionMiddleware,

    // Services
    authService,
    sessionService,
    otpService,
    roleService,
    permissionService,
    notificationService,
    productService,
    categoryService,
    brandService,
    inventoryService,
    reservationService,

    // Consumers
    userRegisteredConsumer,
    productCreatedConsumer,
    orderCreatedConsumer,
    orderCancelledConsumer,

    // Event Bus
    eventPublisher,
    inboxService,

    // Jobs
    publishOutboxJob,

    // Workers
    outboxWorker,
  };
}
