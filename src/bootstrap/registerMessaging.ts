// src/bootstrap/registerMessaging.ts

import { RabbitMQClient } from "../infrastructure/rabbitmq/RabbitMQClient";

import { DeadLetterManager } from "../infrastructure/eventbus/DeadLetterManager";
import { EventConsumer } from "../infrastructure/eventbus/EventConsumer";
import { ExchangeManager } from "../infrastructure/eventbus/ExchangeManager";
import { ModuleRegistrar } from "../infrastructure/eventbus/ModuleRegistrar";
import { QueueManager } from "../infrastructure/eventbus/QueueManager";
import { RetryManager } from "../infrastructure/eventbus/RetryManager";
import { RetryStrategy } from "../infrastructure/eventbus/RetryStrategy";

import { RabbitModules } from "../shared/constants/RabbitModules";
import { RabbitQueues } from "../shared/constants/RabbitQueues";
import { RoutingKeys } from "../shared/constants/RoutingKeys";

import { logger } from "../infrastructure/logging/Logger";

import type { ProductCreatedPayload } from "../modules/catalog/contracts";
import type { UserRegisteredPayload } from "../modules/identity/contracts";
import type {
  OrderCancelledPayload,
  OrderCreatedPayload,
} from "../modules/inventory/contracts";

import type { AppContainer } from "./container";

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 3;
const PREFETCH = 10;

export type MessagingDependencies = Pick<
  AppContainer,
  | "userRegisteredConsumer"
  | "productCreatedConsumer"
  | "orderCreatedConsumer"
  | "orderCancelledConsumer"
  | "inboxService"
>;

/**
 * Declares the whole event-bus topology and starts every consumer.
 *
 * Each handler narrows `event.payload` to its own payload type — that cast is
 * the one place where data off the network becomes typed, and it is exactly
 * where the routing key already tells us what shape to expect.
 */
export async function registerMessaging({
  userRegisteredConsumer,
  productCreatedConsumer,
  orderCreatedConsumer,
  orderCancelledConsumer,
  inboxService,
}: MessagingDependencies): Promise<void> {
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
    maxRetries: MAX_RETRIES,
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

    retryDelay: RETRY_DELAY_MS,

    consumers: [
      {
        queue: RabbitQueues.NOTIFICATION_USER_REGISTERED,

        routingKey: RoutingKeys.USER_REGISTERED,

        handler: async (event) => {
          await userRegisteredConsumer.handle(
            event.payload as UserRegisteredPayload,
          );
        },

        maxRetries: MAX_RETRIES,

        prefetch: PREFETCH,
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

    retryDelay: RETRY_DELAY_MS,

    consumers: [
      {
        queue: RabbitQueues.INVENTORY_PRODUCT_CREATED,

        routingKey: RoutingKeys.PRODUCT_CREATED,

        handler: async (event, tx) => {
          await productCreatedConsumer.handle(
            event.payload as ProductCreatedPayload,
            tx,
          );
        },

        maxRetries: MAX_RETRIES,

        prefetch: PREFETCH,
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

    retryDelay: RETRY_DELAY_MS,

    consumers: [
      {
        queue: RabbitQueues.INVENTORY_ORDER_CREATED,

        routingKey: RoutingKeys.ORDER_CREATED,

        handler: async (event, tx) => {
          await orderCreatedConsumer.handle(
            event.payload as OrderCreatedPayload,
            tx,
          );
        },

        maxRetries: MAX_RETRIES,

        prefetch: PREFETCH,
      },

      {
        queue: RabbitQueues.INVENTORY_ORDER_CANCELLED,

        routingKey: RoutingKeys.ORDER_CANCELLED,

        handler: async (event, tx) => {
          await orderCancelledConsumer.handle(
            event.payload as OrderCancelledPayload,
            tx,
          );
        },

        maxRetries: MAX_RETRIES,

        prefetch: PREFETCH,
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

    retryDelay: RETRY_DELAY_MS,

    consumers: [],
  });

  logger.info("Messaging initialized");
}
