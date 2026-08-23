// src/shared/types/events.ts

import type { EventName } from "../constants/EventNames";
import type { RabbitModule } from "../constants/RabbitModules";
import type { RoutingKey } from "../constants/RoutingKeys";
import type { Transaction } from "./database";

/**
 * What a domain event looks like *before* it is durably recorded: the
 * `{ eventName, module, routingKey, payload }` shape every `events/*.build()`
 * factory produces and `OutboxService.addEvent()` consumes.
 *
 * There is deliberately no `eventId` or `timestamp` here — the outbox row id
 * becomes the id, and the publish-time ISO timestamp is stamped on by
 * `EventPublisher`, so this stays a pure description of "what happened".
 */
export interface DomainEventInput<TPayload = unknown> {
  eventName: EventName;
  module: RabbitModule;
  routingKey: RoutingKey;
  payload: TPayload;
}

/** A domain event that has been assigned its stable id, ready to publish. */
export interface PublishableEvent<TPayload = unknown>
  extends DomainEventInput<TPayload> {
  eventId: string;
}

/**
 * The wire format: exactly what `EventPublisher` serialises onto RabbitMQ
 * and what a consumer reads back off it.
 */
export interface EventEnvelope<TPayload = unknown> {
  eventId: string;
  eventName: string;
  timestamp: string;
  payload: TPayload;
}

/**
 * A consumer callback. It runs inside the transaction opened by
 * `InboxService`, so the inbox row and the handler's own writes commit or
 * roll back together.
 *
 * The payload is `unknown` at this boundary because it came off the network:
 * each registration narrows it to its own payload type before handing it to
 * a module consumer.
 */
export type EventHandler = (
  event: EventEnvelope<unknown>,
  tx: Transaction,
) => Promise<unknown>;
