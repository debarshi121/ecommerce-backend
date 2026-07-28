// src/bootstrap/registerDependencies.js

/*
|--------------------------------------------------------------------------
| Infrastructure
|--------------------------------------------------------------------------
*/

const PostgresClient = require("../infrastructure/postgres/PostgresClient");
const RabbitMQClient = require("../infrastructure/rabbitmq/RabbitMQClient");
const RedisClient = require("../infrastructure/redis/RedisClient");
const CacheService = require("../infrastructure/redis/CacheService");

const PostgresTransactionManager = require("../infrastructure/postgres/PostgresTransactionManager");

// CHANGED
const EventPublisher = require("../infrastructure/eventbus/EventPublisher");

const OtpStore = require("../modules/identity/stores/OtpStore");

/*
|--------------------------------------------------------------------------
| Repositories
|--------------------------------------------------------------------------
*/

const UserRepository = require("../modules/identity/repositories/UserRepository");
const SessionRepository = require("../modules/identity/repositories/SessionRepository");
const RoleRepository = require("../modules/identity/repositories/RoleRepository");
const PermissionRepository = require("../modules/identity/repositories/PermissionRepository");
const OutboxRepository = require("../shared/repositories/OutboxRepository");
const InboxRepository = require("../shared/repositories/InboxRepository");

/*
|--------------------------------------------------------------------------
| Services
|--------------------------------------------------------------------------
*/

const CredentialService = require("../modules/identity/services/CredentialService");
const TokenService = require("../modules/identity/services/TokenService");
const TokenBlacklistService = require("../modules/identity/services/TokenBlacklistService");
const SessionService = require("../modules/identity/services/SessionService");
const OtpService = require("../modules/identity/services/OtpService");
const AuthService = require("../modules/identity/services/AuthService");
const RoleService = require("../modules/identity/services/RoleService");
const PermissionService = require("../modules/identity/services/PermissionService");
const OutboxService = require("../shared/services/OutboxService");
const InboxService = require("../shared/services/InboxService");
const EventBusService = require("../shared/services/EventBusService");
const EmailService = require("../modules/notification/services/EmailService");
const NotificationService = require("../modules/notification/services/NotificationService");

/*
|--------------------------------------------------------------------------
| Providers
|--------------------------------------------------------------------------
*/

const PasswordAuthenticationProvider = require("../modules/identity/providers/PasswordAuthenticationProvider");
const OtpAuthenticationProvider = require("../modules/identity/providers/OtpAuthenticationProvider");
const AuthenticationProviderFactory = require("../modules/identity/providers/AuthenticationProviderFactory");
const ConsoleEmailProvider = require("../modules/notification/providers/ConsoleEmailProvider");

/*
|--------------------------------------------------------------------------
| Consumers
|--------------------------------------------------------------------------
*/

const UserRegisteredConsumer = require("../modules/notification/consumers/UserRegisteredConsumer");

/*
|--------------------------------------------------------------------------
| Controllers
|--------------------------------------------------------------------------
*/

const AuthController = require("../modules/identity/controllers/AuthController");
const OtpController = require("../modules/identity/controllers/OtpController");
const SessionController = require("../modules/identity/controllers/SessionController");
const RoleController = require("../modules/identity/controllers/RoleController");
const PermissionController = require("../modules/identity/controllers/PermissionController");

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

const JwtMiddleware = require("../modules/identity/middleware/JwtMiddleware");
const PermissionMiddleware = require("../modules/identity/middleware/PermissionMiddleware");

/*
|--------------------------------------------------------------------------
| Jobs
|--------------------------------------------------------------------------
*/

const PublishOutboxJob = require("../jobs/PublishOutboxJob");
const OutboxWorker = require("../workers/OutboxWorker");

function registerDependencies() {
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

  /*
  |--------------------------------------------------------------------------
  | Consumers
  |--------------------------------------------------------------------------
  */

  const userRegisteredConsumer = new UserRegisteredConsumer({
    notificationService,
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

    // Consumers
    userRegisteredConsumer,

    // Event Bus
    eventPublisher,
    inboxService,

    // Jobs
    publishOutboxJob,

    // Workers
    outboxWorker,
  };
}

module.exports = registerDependencies;
