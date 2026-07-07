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

async function registerMessaging({ userRegisteredConsumer }) {
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

  const eventConsumer = new EventConsumer(rabbit, retryStrategy);

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

  logger.info("Messaging initialized");
}

module.exports = registerMessaging;
