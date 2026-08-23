const RabbitMQClient = require("../infrastructure/rabbitmq/RabbitMQClient");

const ExchangeManager = require("../infrastructure/eventbus/ExchangeManager");
const QueueManager = require("../infrastructure/eventbus/QueueManager");
const RetryManager = require("../infrastructure/eventbus/RetryManager");
const DeadLetterManager = require("../infrastructure/eventbus/DeadLetterManager");
const RetryStrategy = require("../infrastructure/eventbus/RetryStrategy");
const ModuleRegistrar = require("../infrastructure/eventbus/ModuleRegistrar");
const EventConsumer = require("../infrastructure/eventbus/EventConsumer");

const RabbitModules = require("../shared/constants/RabbitModules");
const RabbitQueues = require("../shared/constants/RabbitQueues");
const RoutingKeys = require("../shared/constants/RoutingKeys");

const logger = require("../infrastructure/logging/Logger");

async function registerMessaging({
  userRegisteredConsumer,
  productCreatedConsumer,
  orderCreatedConsumer,
  orderCancelledConsumer,
  inboxService,
}) {
  const rabbit = RabbitMQClient.getInstance();

  const channel = rabbit.getChannel();

  /*
  ---------------------------------------
  Managers
  ---------------------------------------
  */

  const exchangeManager = new ExchangeManager(channel);

  const queueManager = new QueueManager(channel);

  const retryManager = new RetryManager({
    exchangeManager,
    queueManager,
  });

  const deadLetterManager = new DeadLetterManager({
    exchangeManager,
    queueManager,
  });

  const retryStrategy = new RetryStrategy(channel, {
    maxRetries: 3,
  });

  const eventConsumer = new EventConsumer(rabbit, retryStrategy, inboxService);

  const registrar = new ModuleRegistrar({
    exchangeManager,
    queueManager,
    retryManager,
    deadLetterManager,
    eventConsumer,
  });

  /*
  ---------------------------------------
  Identity Module
  ---------------------------------------
  */

  await registrar.register({
    module: RabbitModules.IDENTITY,

    retryDelay: 5000,

    consumers: [
      {
        queue: RabbitQueues.NOTIFICATION_USER_REGISTERED,

        routingKey: RoutingKeys.USER_REGISTERED,

        handler: async (event) => {
          await userRegisteredConsumer.handle(event.payload);
        },

        maxRetries: 3,

        prefetch: 10,
      },
    ],
  });

  /*
  ---------------------------------------
  Catalog Module
  ---------------------------------------
  */

  await registrar.register({
    module: RabbitModules.CATALOG,

    retryDelay: 5000,

    consumers: [
      {
        queue: RabbitQueues.INVENTORY_PRODUCT_CREATED,

        routingKey: RoutingKeys.PRODUCT_CREATED,

        handler: async (event, tx) => {
          await productCreatedConsumer.handle(event.payload, tx);
        },

        maxRetries: 3,

        prefetch: 10,
      },
    ],
  });

  /*
  ---------------------------------------
  Ordering Module
  (Ordering itself isn't built yet — this registration exists so Inventory
  can already consume OrderCreated/OrderCancelled the moment Ordering starts
  publishing them onto this same exchange.)
  ---------------------------------------
  */

  await registrar.register({
    module: RabbitModules.ORDERING,

    retryDelay: 5000,

    consumers: [
      {
        queue: RabbitQueues.INVENTORY_ORDER_CREATED,

        routingKey: RoutingKeys.ORDER_CREATED,

        handler: async (event, tx) => {
          await orderCreatedConsumer.handle(event.payload, tx);
        },

        maxRetries: 3,

        prefetch: 10,
      },

      {
        queue: RabbitQueues.INVENTORY_ORDER_CANCELLED,

        routingKey: RoutingKeys.ORDER_CANCELLED,

        handler: async (event, tx) => {
          await orderCancelledConsumer.handle(event.payload, tx);
        },

        maxRetries: 3,

        prefetch: 10,
      },
    ],
  });

  /*
  ---------------------------------------
  Inventory Module
  (No inbound consumers of its own yet — this registration ensures
  inventory.exchange + its DLQ/retry infrastructure exist so the outbox
  worker can publish InventoryReserved/Released/Adjusted/Low/
  ReservationFailed onto it.)
  ---------------------------------------
  */

  await registrar.register({
    module: RabbitModules.INVENTORY,

    retryDelay: 5000,

    consumers: [],
  });

  logger.info("Messaging initialized");
}

module.exports = registerMessaging;
