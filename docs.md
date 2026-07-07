# Event-Driven Architecture — A Plain-English Guide to This Project

This doc explains **how the pieces of this backend talk to each other without calling
each other directly**, using a real example already in the code: *a user registers →
the notification module sends them a welcome email*.

No prior event-driven-architecture knowledge assumed. By the end you should be able to
open any file mentioned here and know exactly what it's doing and why.

---

## 1. The problem event-driven architecture solves

Imagine you write it the "normal" way:

```js
// AuthService.register()
const user = await userRepository.create(...);
await emailService.sendWelcomeEmail(user); // <-- direct call
```

This works, but it **couples** the Identity module to the Notification module. If email
sending is slow, registration is slow. If email sending throws, registration fails. And
if tomorrow you also want Reporting to log a "new signup" metric, and Ordering to create
a welcome coupon — `AuthService` has to know about all of them and call all of them
directly. The Identity module ends up importing half the codebase.

**Event-driven architecture flips this around.** `AuthService` doesn't call anyone. It
just announces a fact — *"a user registered"* — and walks away. Any module that cares
about that fact can independently listen for it and react. `AuthService` never needs to
know Notification (or Reporting, or Ordering) exists.

This is exactly the [Observer pattern](https://en.wikipedia.org/wiki/Observer_pattern),
just spread across process/network boundaries instead of within one object.

### The three roles

| Role | Plain-English meaning | In this project |
|---|---|---|
| **Producer** | The code that says "this happened" | `identity` module services, e.g. `AuthService` |
| **Broker** | The middleman that stores and forwards the announcement | RabbitMQ (plus a Postgres "outbox" table in front of it — explained below) |
| **Consumer** | Code that listens for a specific announcement and reacts | `notification` module consumers, e.g. `UserRegisteredConsumer` |

A useful analogy: think of the broker as a **newsletter**. The Identity module doesn't
email anyone directly — it just publishes an issue titled `user.registered`. Anyone
who *subscribed* to that newsletter (the Notification module, in this case) receives a
copy and decides what to do with it. Identity has no idea who's subscribed, and doesn't
care.

---

## 2. Why there are actually *two* layers in this repo (Outbox + RabbitMQ)

If you go looking for "where does Identity publish to RabbitMQ", you'll notice it
doesn't — not directly. There's an extra step called the **Outbox Pattern**, and it
exists to solve a real bug class:

> What if the user gets created in Postgres successfully, but the RabbitMQ publish
> fails right after (network blip, RabbitMQ restart, etc.)? You'd have a user in the
> database with nobody ever told about it — no welcome email, no downstream reaction,
> forever.

The fix: instead of publishing to RabbitMQ *during* the request, the producer writes a
row into a plain Postgres table called `outbox_events`, **in the same database
transaction** as the actual business change (e.g. creating the user row). Postgres
transactions are all-or-nothing, so either both rows are saved or neither is. There is
no window where the user exists but the event doesn't.

A separate background process then reads that table and forwards each row to RabbitMQ
at its own pace, retrying if RabbitMQ is briefly unavailable.

```
   REQUEST TIME (fast, synchronous)              A FEW SECONDS LATER (async)
┌─────────────────────────────┐             ┌──────────────────────────────┐
│ AuthService.register()      │             │ PublishOutboxJob (every 5s)   │
│  - INSERT user               │             │  - read unprocessed rows      │
│  - INSERT outbox_events  ─┐  │             │  - publish each to RabbitMQ   │
│  (one atomic transaction) │  │             │  - mark row processed         │
└────────────────────────────┼──┘             └──────────────┬───────────────┘
                             ▼                                ▼
                    outbox_events table                  RabbitMQ exchange
                    (Postgres, durable)                  (fans out to consumers)
```

So "publishing an event" in this codebase is really a two-step relay:

1. **Write the fact to the outbox table** (safe, transactional, instant).
2. **A background job relays outbox rows to RabbitMQ** (happens up to 5 seconds later).

Keep that ~5 second relay delay in mind — if you register a user and don't see the
welcome email log line immediately, that's expected, not a bug.

---

## 3. Walking through the real example, file by file

Flow: **user calls `POST /auth/register` → Notification module logs a "welcome email"**.

### Step 1 — Producer: something happens, a fact is recorded

[`src/modules/identity/services/AuthService.js`](src/modules/identity/services/AuthService.js) `register()`:

```js
await this.outboxService.addEvent(
  {
    eventName: EventNames.USER_REGISTERED,        // "UserRegistered"
    module: RabbitModules.IDENTITY,                // "identity"
    routingKey: RoutingKeys.USER_REGISTERED,        // "user.registered"
    payload: { userId, name, email },
  },
  client, // <- same DB transaction/client used to INSERT the user row
);
```

This is the *only* thing Identity does. It has never heard of "Notification", "email",
or "welcome message". It just records: *event `UserRegistered` happened, here's the
data, please deliver it on behalf of the `identity` module under the routing key
`user.registered`.* Note it says `module: "identity"`, not a literal exchange name —
the event bus infrastructure (see §4) derives the actual exchange name from the module
automatically, so producers never hardcode RabbitMQ-specific strings.

`outboxService.addEvent()` ([`src/shared/services/OutboxService.js`](src/shared/services/OutboxService.js))
just inserts a row into Postgres via
[`src/shared/repositories/OutboxRepository.js`](src/shared/repositories/OutboxRepository.js).
Nothing about RabbitMQ happens yet. The HTTP request returns to the user right after
this — registration is not slowed down at all.

### Step 2 — Relay: the outbox row is forwarded to RabbitMQ

Every 5 seconds, a recurring BullMQ job fires (registered once at startup in
[`src/bootstrap/registerJobs.js`](src/bootstrap/registerJobs.js)):

```js
await producer.addJob("publish-outbox", {}, { repeat: { every: 5000 } });
```

BullMQ uses **Redis** to schedule/queue this job (this is a *different* queueing system
from RabbitMQ — see the sidebar in §5). A worker process is listening for it:
[`src/workers/OutboxWorker.js`](src/workers/OutboxWorker.js) picks up each tick and
calls [`src/jobs/PublishOutboxJob.js`](src/jobs/PublishOutboxJob.js) `handle()`:

```js
const pendingEvents = await this.outboxService.getUnprocessedEvents(20);
for (const event of pendingEvents) {
  await this.eventBusService.publish(event); // -> RabbitMQ
  await this.outboxService.markProcessed(event.id);
}
```

If `eventBusService.publish()` throws (RabbitMQ down, etc.), the row is simply left
`processed = false` and gets retried on the *next* 5-second tick. Nothing is lost.

`eventBusService.publish()` ([`src/shared/services/EventBusService.js`](src/shared/services/EventBusService.js))
delegates to
[`src/infrastructure/eventbus/EventPublisher.js`](src/infrastructure/eventbus/EventPublisher.js),
which is the only file in the whole project that actually talks to the RabbitMQ
`amqplib` channel to publish:

```js
const messagingModule = new MessagingModule(module); // module = "identity"

this.channel.publish(
  messagingModule.exchange,   // "identity.exchange" — derived, never hardcoded
  routingKey,
  Buffer.from(JSON.stringify(message)),
  { persistent: true },
);
```

`routingKey = "user.registered"`. `persistent: true` tells RabbitMQ to write the
message to disk, so it survives a RabbitMQ restart while it's waiting for a consumer.

### Step 3 — Broker: RabbitMQ routes the message

`identity.exchange` is a **topic exchange**, asserted once at boot when
[`src/bootstrap/registerMessaging.js`](src/bootstrap/registerMessaging.js) registers
the `identity` module (see §4 for how any module gets its own exchange). A topic
exchange's only job is pattern-matching the routing key against whatever queues are
*bound* to it, and copying the message into every queue that matches. The exchange
itself doesn't store anything long-term or know who the consumers are — it's a pure
switchboard.

### Step 4 — Consumer registration: who's listening, and for what

At server startup,
[`src/bootstrap/registerMessaging.js`](src/bootstrap/registerMessaging.js)
sets up the subscription through the `ModuleRegistrar`
([`src/infrastructure/eventbus/ModuleRegistrar.js`](src/infrastructure/eventbus/ModuleRegistrar.js)):

```js
await registrar.register({
  module: RabbitModules.IDENTITY,                   // "identity"
  retryDelay: 5000,
  consumers: [
    {
      queue: RabbitQueues.NOTIFICATION_USER_REGISTERED, // "notification.user.registered"
      routingKey: RoutingKeys.USER_REGISTERED,           // "user.registered"
      handler: async (event) => {
        await userRegisteredConsumer.handle(event.payload);
      },
      maxRetries: 3,
      prefetch: 10,
    },
  ],
});
```

`registrar.register()` is the single entry point for wiring up an entire module. For
the `identity` module it automatically:

1. **Asserts `identity.exchange`** (and the module's retry/dead-letter exchanges — see
   §6a).
2. **Declares a durable queue** named `notification.user.registered` — this is
   Notification's own private mailbox. (If Notification is offline, RabbitMQ keeps
   messages piling up in this queue until it comes back — nothing is dropped.)
3. **Binds that queue to `identity.exchange`** for routing key `user.registered` —
   this is the "subscribe" step. It's literally saying "any message on this exchange
   tagged `user.registered`, copy it into my queue," and also wires the queue's
   dead-letter arguments so failed messages eventually land in the DLQ.
4. **Starts consuming** — for every message that lands in the queue, call `handler`,
   via [`src/infrastructure/eventbus/EventConsumer.js`](src/infrastructure/eventbus/EventConsumer.js).

### Step 5 — Consumer: the reaction

The handler calls
[`src/modules/notification/consumers/UserRegisteredConsumer.js`](src/modules/notification/consumers/UserRegisteredConsumer.js):

```js
async handle(payload) {
  await this.notificationService.sendWelcomeEmail({
    name: payload.name,
    email: payload.email,
  });
}
```

which calls
[`src/modules/notification/services/NotificationService.js`](src/modules/notification/services/NotificationService.js)
→
[`src/modules/notification/services/EmailService.js`](src/modules/notification/services/EmailService.js)
→
[`src/modules/notification/providers/ConsoleEmailProvider.js`](src/modules/notification/providers/ConsoleEmailProvider.js),
which — in this project, today — doesn't send a real email at all. It just
`logger.info("Sending email", {...})`s it to the console. That's intentional: it's a
swappable "provider" (see [`EmailProvider.js`](src/modules/notification/providers/EmailProvider.js)),
so plugging in real SendGrid/SES/etc. later means writing one new class, not touching
any of the event plumbing above.

### Step 6 — Acknowledgement, retry and dead-lettering

Back in `EventConsumer.js`, once your `handler` resolves without throwing:

```js
this.channel.ack(message);
```

`ack` tells RabbitMQ "delivered successfully, you can delete this message from the
queue forever." If the handler throws instead, `EventConsumer` hands the message to
[`RetryStrategy`](src/infrastructure/eventbus/RetryStrategy.js) rather than dropping it:

```js
await this.retryStrategy.handle({ message, error, module, routingKey, maxRetries });
```

`RetryStrategy` reads an `x-retry-count` header off the message:

- **Below `maxRetries`** (default 3): republishes the message to the module's retry
  exchange (`identity.retry.exchange`) with the count incremented, then acks the
  original. The retry queue (`identity.retry.queue`) holds it for a fixed TTL
  (`retryDelay`, default 5s) and then RabbitMQ automatically dead-letters it back onto
  `identity.exchange` with its *original* routing key — which lands it right back in
  `notification.user.registered` for another attempt. This is a delay/backoff
  mechanism built entirely out of RabbitMQ TTL + dead-lettering, no timers or polling
  in application code.
- **At or above `maxRetries`**: nacks the message without requeueing
  (`channel.nack(message, false, false)`). Because the original consumer queue was
  declared with `x-dead-letter-exchange`/`x-dead-letter-routing-key` pointing at the
  module's dead-letter exchange, RabbitMQ automatically routes it to
  `identity.dead-letter.queue` instead of discarding it — so failed messages are always
  inspectable, never silently lost.

See §6a for how this retry/DLQ infrastructure is built generically for *any* module.

### The whole trip, end to end

```
HTTP POST /auth/register
        │
        ▼
AuthService.register()
        │  (same DB transaction)
        ├──▶ INSERT INTO users
        └──▶ INSERT INTO outbox_events  (eventName: UserRegistered, module: identity, processed=false)
        │
        ▼
   [request returns 200 to the client — everything below is async]
        │
        ▼  (up to 5s later — BullMQ recurring tick, via Redis)
PublishOutboxJob.handle()
        │
        ├──▶ SELECT * FROM outbox_events WHERE processed=false
        ├──▶ EventBusService.publish()  ──▶  EventPublisher  ──▶  RabbitMQ
        │        new MessagingModule("identity").exchange  =  "identity.exchange"
        │        channel.publish("identity.exchange", "user.registered", payload)
        └──▶ UPDATE outbox_events SET processed=true
        │
        ▼
RabbitMQ "identity.exchange" (topic exchange)
        │  routing key "user.registered" matches binding
        ▼
Queue "notification.user.registered"  (Notification's private mailbox)
        │
        ▼
EventConsumer's channel.consume() fires
        │
        ├──▶ success ──▶ channel.ack(message)   // done, remove from queue
        │
        └──▶ throws  ──▶ RetryStrategy.handle()
                            │
                            ├─ retryCount < maxRetries ─▶ republish to
                            │    "identity.retry.exchange" ─▶ "identity.retry.queue"
                            │    (parked for `retryDelay` ms via x-message-ttl) ─▶
                            │    TTL expires ─▶ dead-lettered back onto
                            │    "identity.exchange" with the original routing key
                            │    ─▶ redelivered to "notification.user.registered"
                            │
                            └─ retryCount >= maxRetries ─▶ nack(requeue=false) ─▶
                                 "identity.dead-letter.queue" (parked for inspection)
        │
        ▼  (happy path)
UserRegisteredConsumer.handle(payload)
        │
        ▼
NotificationService.sendWelcomeEmail()  ──▶  EmailService  ──▶  ConsoleEmailProvider
```

---

## 4. The naming system — how a producer and consumer "agree" on an event

There is no shared code path between Identity (producer) and Notification (consumer) —
they agree purely by convention, through shared string constants:

| Concept | What it means | Defined in | Value for this example |
|---|---|---|---|
| **Module** | The bounded context/producer announcing the event | [`src/shared/constants/RabbitModules.js`](src/shared/constants/RabbitModules.js) | `identity` |
| **Exchange** | Which broker "channel"/switchboard the message goes through | *derived* — see below | `identity.exchange` |
| **Routing key** | The "topic" of the message — used to match it to queues | [`src/shared/constants/RoutingKeys.js`](src/shared/constants/RoutingKeys.js) | `user.registered` |
| **Event name** | Human-readable label carried *inside* the message body, for logging/handlers | [`src/shared/constants/EventNames.js`](src/shared/constants/EventNames.js) | `UserRegistered` |
| **Queue** | The consumer's own private mailbox name | [`src/shared/constants/RabbitQueues.js`](src/shared/constants/RabbitQueues.js) | `notification.user.registered` |

Unlike the other three, **Exchange is not a constant anyone hand-writes.** It's
computed on the fly by
[`MessagingModule`](src/infrastructure/eventbus/MessagingModule.js): `new
MessagingModule("identity").exchange` returns `"identity.exchange"` for *any* module
string, including ones that don't exist yet (`ordering`, `payment`, ...). This is
deliberate — see §6a for why, and how it lets new modules plug in without touching any
infrastructure code.

> **Note while reading the code:** `EventNames` and `RoutingKeys` used to contain the
> exact same string values, which was confusing. They've been split so `EventNames` is a
> human-readable label (PascalCase, e.g. `"UserRegistered"`, carried *inside* the
> message body) and `RoutingKeys` is the RabbitMQ-routing string (dot-case, e.g.
> `"user.registered"`, used for topic-exchange binding). They describe the same event but
> serve different audiences: `eventName` is for a human/log reading the message later,
> `routingKey` is for RabbitMQ's routing logic.

Producers only need `Module + Routing key + Event name`. Consumers only need
`Module + Routing key + Queue name`. Nobody needs to import the other module — the
strings are the entire contract.

---

## 5. A second, unrelated queue system: BullMQ / Redis

It's easy to mix these up, so to be explicit: **this project uses two different
message-queueing technologies for two different jobs.**

| | RabbitMQ | BullMQ (on top of Redis) |
|---|---|---|
| Used for | Cross-module domain events (`user.registered`, etc.) | Internal scheduled/background jobs |
| Example in this repo | Identity → Notification event delivery | The recurring "relay the outbox every 5s" job |
| Files | `src/infrastructure/rabbitmq/*` (connection) + `src/infrastructure/eventbus/*` (exchanges/queues/retry/DLQ/pub-sub) | `src/infrastructure/bullmq/*` |
| Consumer concept | `EventConsumer` binds a queue to an exchange | `QueueWorker` (wraps BullMQ's `Worker`) runs a handler for jobs on a named queue |

The outbox relay ([`PublishOutboxJob`](src/jobs/PublishOutboxJob.js)) is a BullMQ job,
not a RabbitMQ consumer — it's the thing that *produces* onto RabbitMQ, on a timer.
`src/workers/OutboxWorker.js` is just a thin wrapper that wires
`QueueWorker("outbox-queue", handler)` to `PublishOutboxJob.handle`.

There's also [`src/jobs/CleanupExpiredSessionsJob.js`](src/jobs/CleanupExpiredSessionsJob.js)
as another example of a plain scheduled background job with no RabbitMQ involvement at
all — useful to look at if you want a "background job" example that *isn't* about
events.

---

## 6. Known gaps in this codebase today (read this before you assume something is broken)

Since this project was scaffolded with AI help, a few pieces are half-wired. These
aren't secret bugs — they're just unfinished — but you'll trip over them if you go
looking for "why doesn't the OTP email show up in the console":

1. **`OtpRequiredConsumer` is never registered.**
   [`src/modules/notification/consumers/OtpRequiredConsumer.js`](src/modules/notification/consumers/OtpRequiredConsumer.js)
   exists and looks complete, but unlike `UserRegisteredConsumer`, it is never
   instantiated in
   [`src/bootstrap/registerDependencies.js`](src/bootstrap/registerDependencies.js) and
   never added to the `identity` module's `consumers` list in
   [`src/bootstrap/registerMessaging.js`](src/bootstrap/registerMessaging.js).
   Even if an `auth.otp.required` event reached RabbitMQ, nothing is listening for it.

2. **The real OTP route doesn't use the outbox/event system at all.**
   `POST /otp/request` → `OtpController.requestOtp()` →
   [`OtpService.requestOtp()`](src/modules/identity/services/OtpService.js) — and that
   method calls `eventPublisher.publish("domain-events", "auth.otp.required", {...})`
   **directly**, skipping the outbox table entirely, and calling `.publish()` with
   three positional arguments where `EventPublisher.publish()` expects **one object**
   argument (`{ module, routingKey, eventName, payload }`) — so this call is
   effectively broken today and won't successfully deliver a real message.
   Meanwhile, there's a *second*, unused, correctly-outbox-based implementation sitting
   right next to it: [`AuthService.requestOtp()`](src/modules/identity/services/AuthService.js#L207)
   does it the "right" way (matching the pattern in §3) but no route calls it.
   → If you want OTP emails to actually work, wire the route to `AuthService.requestOtp`
   and finish registering `OtpRequiredConsumer`, then add a `sendOtpNotification` method
   to `NotificationService` (see §7 below — it doesn't exist yet either).

3. **`SmsService`** ([`src/modules/notification/services/SmsService.js`](src/modules/notification/services/SmsService.js))
   is a stub that's never instantiated or wired to anything — a placeholder for future
   SMS notifications, not currently reachable from any event.

---

## 6a. The event bus infrastructure itself — building blocks for *any* module

Everything above (§3) is one concrete example (Identity → Notification). The pieces
that make it generic — reusable for Catalog, Inventory, Cart, Ordering, Payment,
Reporting, etc. without touching any infrastructure code — live in
[`src/infrastructure/eventbus/`](src/infrastructure/eventbus/):

| File | Responsibility |
|---|---|
| [`RabbitMQClient.js`](src/infrastructure/rabbitmq/RabbitMQClient.js) | Owns the amqplib connection/channel lifecycle. Knows nothing about exchanges, queues, or events. |
| [`MessagingModule.js`](src/infrastructure/eventbus/MessagingModule.js) | Given a module name string (`"identity"`), derives its exchange, retry exchange, dead-letter exchange, retry queue, and dead-letter queue names. The single source of truth for naming — nobody hardcodes a `*.exchange` string anywhere else. |
| [`ExchangeManager.js`](src/infrastructure/eventbus/ExchangeManager.js) | Asserts durable topic exchanges. Nothing else. |
| [`QueueManager.js`](src/infrastructure/eventbus/QueueManager.js) | Asserts durable queues and binds them to exchanges. No retry/consumer logic. |
| [`DeadLetterManager.js`](src/infrastructure/eventbus/DeadLetterManager.js) | Builds a module's dead-letter exchange + queue. |
| [`RetryManager.js`](src/infrastructure/eventbus/RetryManager.js) | Builds a module's retry exchange + queue (TTL-based, `x-message-ttl` + `x-dead-letter-exchange`). One retry queue is shared by every consumer in the module — it's bound with a catch-all `#` routing key and relies on RabbitMQ preserving each message's original routing key on TTL expiry, so retried messages land back in the *correct* consumer queue regardless of which one they came from. |
| [`RetryStrategy.js`](src/infrastructure/eventbus/RetryStrategy.js) | Pure retry/DLQ policy: reads `x-retry-count` off a failed message, republishes to the retry exchange (incrementing the count) while under the limit, or nacks to the dead-letter queue once the limit is hit. Takes the module and routing key as call arguments — it holds no business-module knowledge itself. |
| [`EventConsumer.js`](src/infrastructure/eventbus/EventConsumer.js) | Generic consume loop: prefetch, JSON-deserialize, call the handler, ack on success, hand off to `RetryStrategy` on failure. |
| [`EventPublisher.js`](src/infrastructure/eventbus/EventPublisher.js) | `publish({ module, eventName, routingKey, payload })` — resolves the exchange from `module` via `MessagingModule` and publishes a `{ eventName, timestamp, payload }` envelope, persistent. |
| [`ModuleRegistrar.js`](src/infrastructure/eventbus/ModuleRegistrar.js) | The single entry point. `register({ module, retryDelay, consumers })` wires up everything above for one module: exchange, DLQ, retry queue, each consumer's queue + binding + dead-letter args, then starts consuming. No module-specific RabbitMQ code exists anywhere else. |

### How to add a brand-new module (e.g. Payment, Ordering) without touching infrastructure

Say Payment needs to react to `order.placed` events from Ordering. None of the files in
the table above change. You only need to:

1. **Add the module name** to [`RabbitModules.js`](src/shared/constants/RabbitModules.js)
   (already includes `ORDERING`/`PAYMENT`/etc. as string constants — `"ordering"`,
   `"payment"`).
2. **Add routing key / queue / event name constants**, following the existing pattern:
   - `RoutingKeys.ORDER_PLACED = "order.placed"`
   - `RabbitQueues.PAYMENT_ORDER_PLACED = "payment.order.placed"`
   - `EventNames.ORDER_PLACED = "OrderPlaced"`
3. **Producer side (Ordering):** write to the outbox the same way `AuthService` does —
   `outboxService.addEvent({ eventName, module: RabbitModules.ORDERING, routingKey, payload }, client)`.
   The existing `PublishOutboxJob` relays it to RabbitMQ for you; nothing new to build.
4. **Consumer side (Payment):** write a plain handler class (e.g.
   `OrderPlacedConsumer`), wire it into DI in `registerDependencies.js`, then register it
   in `registerMessaging.js`:
   ```js
   await registrar.register({
     module: RabbitModules.PAYMENT,
     retryDelay: 5000,
     consumers: [
       {
         queue: RabbitQueues.PAYMENT_ORDER_PLACED,
         routingKey: RoutingKeys.ORDER_PLACED,
         handler: async (event) => orderPlacedConsumer.handle(event.payload),
         maxRetries: 3,
       },
     ],
   });
   ```
   That one call creates `payment.exchange`, `payment.retry.exchange` /
   `payment.retry.queue`, `payment.dead-letter.exchange` / `payment.dead-letter.queue`,
   the `payment.order.placed` consumer queue, all the bindings, and starts consuming —
   with the same TTL-retry-then-DLQ behavior Identity/Notification gets, for free.

No file inside `src/infrastructure/` needs to change for this or any future module —
that's the point of `MessagingModule` deriving names generically instead of a growing
`ExchangeNames`-style constants file.

---

## 7. Recipe: adding your own event reaction

Say you want: *when a user logs in, write a log line from the Notification module* (or
substitute your own reaction — the shape is identical for any new event/consumer pair).

**On the producer side — nothing to do!** Login already announces itself:
[`AuthService.login()`](src/modules/identity/services/AuthService.js) already does:

```js
await this.outboxService.addEvent(
  {
    eventName: EventNames.USER_LOGGED_IN,
    module: RabbitModules.IDENTITY,
    routingKey: RoutingKeys.USER_LOGGED_IN,
    payload: { userId: user.id },
  },
  client,
);
```

So the event already reaches RabbitMQ today — nobody's just listening for it yet. To
react to it:

1. **Add a queue name constant** in
   [`src/shared/constants/RabbitQueues.js`](src/shared/constants/RabbitQueues.js):
   ```js
   NOTIFICATION_USER_LOGGED_IN: "notification.user.logged_in",
   ```

2. **Write a consumer class**, modeled on
   [`UserRegisteredConsumer.js`](src/modules/notification/consumers/UserRegisteredConsumer.js):
   ```js
   // src/modules/notification/consumers/UserLoggedInConsumer.js
   class UserLoggedInConsumer {
     constructor({ notificationService }) {
       this.notificationService = notificationService;
     }

     async handle(payload) {
       await this.notificationService.logLoginEvent(payload.userId);
     }
   }

   module.exports = UserLoggedInConsumer;
   ```

3. **Add the method it calls** to
   [`NotificationService.js`](src/modules/notification/services/NotificationService.js):
   ```js
   async logLoginEvent(userId) {
     logger.info("User logged in", { userId });
   }
   ```

4. **Wire it up in the DI container**,
   [`src/bootstrap/registerDependencies.js`](src/bootstrap/registerDependencies.js) —
   require the new consumer class near `UserRegisteredConsumer`, instantiate it the same
   way, and return it from the container:
   ```js
   const userLoggedInConsumer = new UserLoggedInConsumer({ notificationService });
   // ...and add `userLoggedInConsumer,` to the returned object
   ```

5. **Add it to the `identity` module's consumer list in**
   [`src/bootstrap/registerMessaging.js`](src/bootstrap/registerMessaging.js) —
   the module stays `identity` since it's still Identity announcing the event; you're
   just adding one more entry to that module's `consumers` array passed to
   `registrar.register()`:
   ```js
   await registrar.register({
     module: RabbitModules.IDENTITY,
     retryDelay: 5000,
     consumers: [
       {
         queue: RabbitQueues.NOTIFICATION_USER_REGISTERED,
         routingKey: RoutingKeys.USER_REGISTERED,
         handler: async (event) => userRegisteredConsumer.handle(event.payload),
         maxRetries: 3,
       },
       {
         queue: RabbitQueues.NOTIFICATION_USER_LOGGED_IN,
         routingKey: RoutingKeys.USER_LOGGED_IN,
         handler: async (event) => userLoggedInConsumer.handle(event.payload),
         maxRetries: 3,
       },
     ],
   });
   ```
   Also accept `userLoggedInConsumer` in `registerMessaging`'s destructured parameter at
   the top of the file. `ModuleRegistrar` takes care of declaring the new queue,
   binding it, wiring its dead-letter arguments, and starting the consumer — you never
   touch `ExchangeManager`/`QueueManager`/`RetryManager`/`EventConsumer` directly.

6. **Restart the server.** Log in through the API, wait up to 5 seconds (outbox relay
   delay), and watch the console for your log line.

That's the entire recipe for *any* new "module B reacts to module A's event" wiring in
this codebase — only steps 2–5 change per event; the producer side is usually already
emitting more events than currently have listeners (check `EventNames.js` for events
nobody's consuming yet, e.g. `USER_LOGGED_OUT`, `USER_LOGGED_OUT_ALL_DEVICES`). For a
*new module* rather than a new consumer on an existing module, see §6a instead.

---

## 8. Running it locally to see the flow yourself

Infrastructure (Postgres, Redis, RabbitMQ) is defined in
[`docker/docker-compose.yml`](docker/docker-compose.yml):

```bash
docker compose -f docker/docker-compose.yml up -d
npm run migrate
npm run dev
```

- RabbitMQ management UI: **http://localhost:15672** (user/pass: `guest`/`guest`) — you
  can watch exchanges, queues, and message rates live here. Go to the **Queues** tab
  after registering a user and you'll see `notification.user.registered` briefly get a
  message then drop back to 0 once consumed.
- Everything (HTTP server, the RabbitMQ consumer, and the BullMQ outbox worker) runs in
  the **same Node process** here — see the boot sequence in
  [`src/server.js`](src/server.js). There's no separate "worker" process to start; in a
  real production split you'd likely run the HTTP server and the workers as separate
  deployables, but this project keeps them together for simplicity.

To actually watch the flow: call `POST /auth/register`, then watch your terminal log —
you'll see the request return immediately, and a few seconds later a
`"Outbox event published"` log line followed by a `"Sending email"` log line. Those two
log lines are steps 2 and 5 from §3, happening asynchronously after your HTTP response
already went back to the client.

---

## 9. Glossary

- **Producer** — code that announces a fact happened. Doesn't know or care who's
  listening.
- **Consumer** — code that reacts to a specific announcement. Doesn't know or care who
  produced it.
- **Broker** — the middleman (RabbitMQ here) that receives, stores briefly, and routes
  messages from producers to consumers.
- **Exchange** — a named routing point inside RabbitMQ. Producers publish *to an
  exchange*, never directly to a queue.
- **Queue** — a durable, ordered mailbox that messages sit in until a consumer takes
  them. Each consumer type gets its own queue, bound to whichever exchange(s)/routing
  keys it cares about.
- **Routing key** — a label attached to a published message, used by the exchange to
  decide which bound queues should receive a copy.
- **Binding** — the declared link "queue X wants messages from exchange Y matching
  routing key Z". Created by the consumer at startup, not the producer.
- **Ack / Nack** — how a consumer tells the broker "I successfully processed this,
  delete it" (ack) or "I failed, handle it as an error" (nack).
- **Module (bounded context)** — the producer's own identity in the event bus (e.g.
  `"identity"`, `"payment"`). The single input `MessagingModule` needs to derive all of
  that module's exchange/retry/DLQ naming — see §6a.
- **Retry queue** — a TTL-bound holding queue (`{module}.retry.queue`) a failed message
  sits in briefly before RabbitMQ automatically routes it back to the main exchange for
  another delivery attempt. Implements backoff without any application-level timers.
- **Dead-letter queue (DLQ)** — where a message ends up (`{module}.dead-letter.queue`)
  after exhausting its retry attempts. Nothing is ever silently dropped; a stuck message
  is always inspectable in its module's DLQ.
- **Outbox pattern** — writing an event to a database table in the same transaction as
  the business change it describes, then relaying it to the real broker separately.
  Prevents "database updated but nobody was told" bugs.
- **At-least-once delivery** — the guarantee this whole system provides: an event will
  be delivered one or more times, never zero (as long as consumers eventually come back
  online). It is *not* exactly-once — a consumer could theoretically process the same
  event twice (e.g. if it crashes after processing but before acking). None of the
  current consumers here are written to guard against double-processing (they're not
  "idempotent") — worth keeping in mind if you add a consumer that does something
  non-repeatable, like charging a card.
