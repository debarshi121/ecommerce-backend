// src/infrastructure/eventbus/EventPublisher.ts

import type { Channel } from "amqplib";

import type { IEventPublisher } from "../../shared/contracts";
import type { EventEnvelope, PublishableEvent } from "../../shared/types/events";
import type { RabbitMQClient } from "../rabbitmq/RabbitMQClient";

import { MessagingModule } from "./MessagingModule";

export class EventPublisher implements IEventPublisher {
  private readonly channel: Channel;

  constructor(rabbitClient: RabbitMQClient) {
    this.channel = rabbitClient.getChannel();
  }

  async publish({
    eventId,
    module,
    eventName,
    routingKey,
    payload,
  }: PublishableEvent): Promise<void> {
    if (!eventId) {
      throw new Error(
        "EventPublisher.publish requires a stable eventId (pass the Outbox row id) so consumers can deduplicate redeliveries",
      );
    }

    const messagingModule = new MessagingModule(module);

    const message: EventEnvelope = {
      eventId,
      eventName,
      timestamp: new Date().toISOString(),
      payload,
    };

    this.channel.publish(
      messagingModule.exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
      },
    );
  }
}
