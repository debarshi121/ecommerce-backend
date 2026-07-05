const RabbitMQClient = require("../infrastructure/rabbitmq/RabbitMQClient");
const EventConsumer = require("../infrastructure/rabbitmq/EventConsumer");
const ExchangeNames = require("../shared/constants/ExchangeNames");
const RoutingKeys = require("../shared/constants/RoutingKeys");
const RabbitQueues = require("../shared/constants/RabbitQueues");
const logger = require("../infrastructure/logging/Logger");

async function registerEventConsumers({ userRegisteredConsumer }) {
  const rabbit = RabbitMQClient.getInstance();

  const consumer = new EventConsumer(rabbit);

  await consumer.consume({
    exchange: ExchangeNames.IDENTITY,
    queue: RabbitQueues.NOTIFICATION_USER_REGISTERED,
    routingKey: RoutingKeys.USER_REGISTERED,
    handler: async (event) => {
      await userRegisteredConsumer.handle(event.payload);
    },
  });

  logger.info("RabbitMQ consumers registered");
}

module.exports = registerEventConsumers;
