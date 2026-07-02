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

const EventPublisher = require("../infrastructure/rabbitmq/EventPublisher");
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

/*
|--------------------------------------------------------------------------
| Services
|--------------------------------------------------------------------------
*/

const CredentialService = require("../modules/identity/services/CredentialService");

const TokenService = require("../modules/identity/services/TokenService");

const SessionService = require("../modules/identity/services/SessionService");

const OtpService = require("../modules/identity/services/OtpService");

const AuthService = require("../modules/identity/services/AuthService");

const PasswordAuthenticationProvider = require("../modules/identity/providers/PasswordAuthenticationProvider");
const OtpAuthenticationProvider = require("../modules/identity/providers/OtpAuthenticationProvider");
const AuthenticationProviderFactory = require("../modules/identity/providers/AuthenticationProviderFactory");

const RoleService = require("../modules/identity/services/RoleService");

const PermissionService = require("../modules/identity/services/PermissionService");

const OutboxService = require("../shared/services/OutboxService");

const EventBusService = require("../shared/services/EventBusService");

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
| Workers
|--------------------------------------------------------------------------
*/

const OutboxPublisherWorker = require("../workers/OutboxPublisherWorker");

function registerDependencies() {
  /*
  --------------------------------------------------------------------------
  Infrastructure instances
  --------------------------------------------------------------------------
  */

  const db = PostgresClient.getInstance();

  const rabbit = RabbitMQClient.getInstance();

  const redis = RedisClient.getInstance();

  const cacheService = new CacheService(redis);

  const otpStore = new OtpStore(cacheService);

  const transactionManager = new PostgresTransactionManager(db);

  const eventPublisher = new EventPublisher(rabbit);

  /*
  --------------------------------------------------------------------------
  Repository instances
  --------------------------------------------------------------------------
  */

  const userRepository = new UserRepository(db);

  const sessionRepository = new SessionRepository(db);

  const roleRepository = new RoleRepository(db);

  const permissionRepository = new PermissionRepository(db);

  const outboxRepository = new OutboxRepository(db);

  /*
  --------------------------------------------------------------------------
  Service instances
  --------------------------------------------------------------------------
  */

  const credentialService = new CredentialService(userRepository);

  const tokenService = new TokenService();

  const otpService = new OtpService({
    otpStore,
    eventPublisher,
  });

  const sessionService = new SessionService({
    sessionRepository,
    tokenService,
  });

  const roleService = new RoleService({
    roleRepository,
    permissionRepository,
  });

  const permissionService = new PermissionService(permissionRepository);

  const outboxService = new OutboxService({
    outboxRepository,
  });

  const eventBusService = new EventBusService({
    eventPublisher,
  });

  const passwordProvider = new PasswordAuthenticationProvider(credentialService);

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
    authenticationProviderFactory,
  });

  /*
  --------------------------------------------------------------------------
  Controller instances
  --------------------------------------------------------------------------
  */

  const authController = new AuthController(authService);

  const otpController = new OtpController(otpService);

  const sessionController = new SessionController(authService);

  const roleController = new RoleController(roleService);

  const permissionController = new PermissionController(permissionService);

  /*
  --------------------------------------------------------------------------
  Middleware instances
  --------------------------------------------------------------------------
  */

  const jwtMiddleware = new JwtMiddleware({
    tokenService,
    userRepository,
  });

  const permissionMiddleware = new PermissionMiddleware({
    userRepository,
  });

  /*
  --------------------------------------------------------------------------
  Worker instances
  --------------------------------------------------------------------------
  */

  const outboxPublisherWorker = new OutboxPublisherWorker({
    outboxService,
    eventBusService,
  });

  /*
  --------------------------------------------------------------------------
  Export dependency container
  --------------------------------------------------------------------------
  */

  return {
    // controllers
    authController,
    otpController,
    sessionController,
    roleController,
    permissionController,

    // middleware
    jwtMiddleware,
    permissionMiddleware,

    // services (optional export)
    authService,
    sessionService,
    otpService,
    roleService,
    permissionService,

    // workers
    outboxPublisherWorker,
  };
}

module.exports = registerDependencies;
