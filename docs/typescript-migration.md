# TypeScript Migration

This document explains what changed when the backend was converted from
CommonJS JavaScript to TypeScript, why each decision was made, and the small
number of places where behaviour intentionally changed.

**Scope:** all 174 `.js` files under `src/` became `.ts`, plus 14 new
type/contract files. No endpoint, table, queue, exchange, routing key, or
request/response shape was renamed. The Postman collection still applies
unchanged.

---

## 1. Toolchain

| Concern | Choice |
|---|---|
| Compiler | `typescript` 7.x, `tsc -p tsconfig.json` → `dist/` |
| Module format | CommonJS output (unchanged runtime semantics), ESM-style `import`/`export` in source |
| Dev runner | `tsx watch src/server.ts` (replaces `nodemon src/server.js`; `nodemon` was removed) |
| Types added | `@types/node`, `@types/express`, `@types/pg`, `@types/bcrypt`, `@types/jsonwebtoken` (amqplib, redis, bullmq, socket.io, pino and zod ship their own) |

### Scripts

```bash
npm run dev         # tsx watch src/server.ts
npm run build       # tsc -> dist/
npm start           # node dist/server.js
npm run typecheck   # tsc --noEmit
npm run migrate     # tsx src/scripts/migrate.ts
npm run seed:identity | seed:catalog | seed:inventory
```

`dist/` is gitignored.

### Compiler settings that matter

`strict` is on, plus four checks that were chosen deliberately because they
catch the failure modes this codebase actually has:

- **`noUncheckedIndexedAccess`** — `result.rows[0]` is `T | undefined`, not
  `T`. Every repository read had to state whether it expected zero-or-one row
  or exactly one. That is what `shared/utils/rows.ts` encodes (below).
- **`noImplicitOverride`** — a provider subclass must say `override`, so a
  renamed base method cannot silently become a new, never-called one.
- **`noImplicitReturns`** / **`noFallthroughCasesInSwitch`** — the status
  transition and provider-factory switches are now exhaustive by construction.
- **`useUnknownInCatchVariables`** (implied by `strict`) — `catch (error)` is
  `unknown`, which is why error logging is now
  `error instanceof Error ? error.message : String(error)`.

`tsc --noEmit` is clean: **zero errors, zero `any` annotations, zero
`@ts-ignore`**.

---

## 2. Layering and where types live

The existing module structure was good and was kept. What TypeScript added is
an explicit contract at every seam.

```
src/
├── shared/types/        # database, entities, events, http, pagination
├── shared/contracts.ts  # ports shared by >1 module (cache, outbox, inbox, publisher)
├── shared/utils/        # rows.ts, sqlUpdate.ts, slugify.ts
├── modules/<mod>/contracts.ts   # that module's ports + command/result/payload types
├── bootstrap/container.ts       # AppContainer: the shape of the composed graph
└── types/express.d.ts           # req.user / req.requestId / req.validated
```

### 2.1 Rows are the persistence shape

`shared/types/entities.ts` has one interface per table (`UserRow`,
`ProductRow`, `InventoryRow`, …) mirroring exactly what `pg` returns: UUID →
`string`, `TIMESTAMP` → `Date`, `JSONB` → object, `BIGINT` → `string` (hence
the `Number(totalCount)` at each call site, now typed rather than assumed).

Two projections are distinguished on purpose:

```ts
UserWithRoleRow        // findByEmail — includes passwordHash (auth needs it)
SafeUserWithRoleRow    // findById   — Omit<…, "passwordHash">
```

`GET /session/me` returns the second one, so a credential hash can no longer
reach a response by accident — it is not in the type.

### 2.2 `QueryExecutor`: the `tx || this.db` idiom, typed

Every repository method ends in `const executor = tx ?? this.db`. That works
because both the pooled client and a per-transaction `pg.PoolClient` satisfy
one small interface:

```ts
export interface QueryExecutor {
  query<R extends QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<R>>;
}
```

Repositories depend on `QueryExecutor`, not on `PostgresClient`. Services
depend on `ITransactionManager`, not on `PostgresTransactionManager`. Nothing
in business logic names `pg`, `redis`, or `amqplib`.

### 2.3 Ports and adapters (DIP)

Each module's `contracts.ts` declares the interfaces it depends on; the
concrete class `implements` them and is bound once in
`bootstrap/registerDependencies.ts`.

```
AuthService  ->  IUserRepository, ICredentialService, ITokenService,
                 ISessionService, IOutboxService, ITransactionManager, …
                        ^ interfaces, all injected
```

This is what makes the offline verification in §6 possible: the whole identity
and inventory stack can be constructed against in-memory fakes with no
database, broker, or cache running.

### 2.4 `AppContainer` and interface segregation

`registerDependencies()` now returns a typed `AppContainer`. Route groups do
not receive the whole container type — each declares exactly what it needs:

```ts
export interface BrandRouteDependencies {
  brandController: BrandController;
  jwtMiddleware: JwtMiddleware;
  permissionMiddleware: PermissionMiddleware;
}
```

A module's `routes/index.ts` then intersects its groups'
requirements (`ProductRouteDependencies & CategoryRouteDependencies & …`), so
under-wiring the container is a compile error rather than a
`TypeError: undefined is not a function` on the first request.

### 2.5 Constants became const-objects with derived unions

```ts
export const ProductStatus = { DRAFT: "DRAFT", … } as const;
export type ProductStatusValue = (typeof ProductStatus)[keyof typeof ProductStatus];
```

The same pattern applies to `EventNames`, `RoutingKeys`, `RabbitModules`,
`RabbitQueues`, `InboxStatus`, `BullQueues`, `ReservationStatus` and
`StockMovementType`. Consequences:

- `ProductRow.status` is the four-value union, not `string`.
- `DomainEventInput` requires a real `EventName`/`RabbitModule`/`RoutingKey`,
  so a typo in a routing key cannot compile.
- Zod reuses the same objects — `z.enum(ProductStatus)` — so the validator and
  the domain can never drift apart.

Two mixed-concern constants were split for cohesion:

- `ProductStatus` → statuses + `PRODUCT_STATUS_TRANSITIONS` + `canTransition()`
- `ReservationStatus` → statuses + `RESERVATION_STATUS_TRANSITIONS` +
  `RESERVATION_DEFAULT_TTL_MINUTES` + `canTransition()`

The transition tables are typed `Record<StatusValue, readonly StatusValue[]>`,
which makes them **exhaustive**: adding a status without giving it a row is a
compile error. `ProductService` and `ReservationService` now call
`canTransition()` instead of indexing a loose object with a possibly-missing
key.

### 2.6 Discriminated unions instead of ambiguous result objects

Inventory's reservation flow had result objects whose fields were only
sometimes present. They are now unions, so the compiler enforces the check:

```ts
export type ReserveAttempt =
  | { ok: true;  inventory: InventoryRow }
  | { ok: false; reason: ShortageReason; available: number };

export type ReserveStockResult =
  | { success: true;  reservations: ReservationRow[] }
  | { success: false; shortage: ReservationShortage };
```

Reading `attempt.inventory` without first checking `attempt.ok` no longer
compiles. `ShortageReason` is `"INVENTORY_NOT_FOUND" | "INSUFFICIENT_STOCK"`,
so the strings that travel out in `InventoryReservationFailed` are fixed by
the type.

---

## 3. New shared helpers (deduplication)

| Helper | Replaces | Why |
|---|---|---|
| `shared/utils/rows.ts` — `firstOrNull`, `firstOrFail`, `toPage` | 35 hand-written `result.rows[0] \|\| null` sites and 6 copies of the `COUNT(*) OVER()` split (across 4 files) | Under `noUncheckedIndexedAccess` each site had to declare intent once; `toPage` also strips `totalCount` from every row in one place |
| `shared/utils/sqlUpdate.ts` — `buildUpdateAssignments` | 3 copies of the dynamic-`SET` builder in Product/Category/Brand repositories | One implementation of the column allow-list rule, with per-key encoders (`metadata` → `JSON.stringify`) |
| `shared/types/pagination.ts` — `buildPaginationMeta` | 3 copies of `totalPages: Math.max(1, Math.ceil(total / limit))` | Same envelope shape everywhere |
| `InventoryService.recordMovement` / `returnToAvailable` | 9 inline `createMovement({...})` blocks and a duplicated compensating update | Same ledger write, one signature |
| `ProductService.applyPatch` | 4 near-identical `execute(tx => { update; addEvent(ProductUpdated…) })` blocks | Guarantees the update and its event share one transaction |
| `ReservationService.transition` | 5 copies of assert-then-update | No state change can skip the transition guard |
| `TokenService.verify` | 2 copies of the verify/`instanceof`-ladder | One place that maps jsonwebtoken errors to 401 |
| `SessionService.assertUsable` | 2 copies of null + expiry checks | — |
| Catalog/identity services: `requireBrand`, `requireCategory`, `requireProduct`, `requireRole` | repeated find-then-throw | — |

`ProductRepository` also hoists its shared `SELECT` projection and joins into
`PRODUCT_WITH_RELATIONS` / `PRODUCT_JOINS` constants (previously duplicated
three times across `findById`, `findBySlug` and `search`).

---

## 4. Request validation is now the source of truth for input types

`validate()` used to parse and **throw away** the result. It now stores the
parsed output on `req.validated`, and handlers read it back through a typed
accessor:

```ts
const { params, query } = validated<ProductQueryInput>(req);
//    ^ ProductQueryInput = z.infer<typeof ProductQueryValidator>
```

Each validator exports both the schema and its inferred type, so the schema
and the handler's view of the request cannot drift.

This also **fixes a real bug** (see §5.1): `z.coerce.number()` and `.default()`
in `ProductQueryValidator`, `StockHistoryQueryValidator` and
`ReservationsQueryValidator` did real work that was previously discarded.

`req.validated`, `req.user` and `req.requestId` are declared once in
`src/types/express.d.ts`, so `req.user!.id` guesswork is gone — handlers that
can run without a token check `req.user` explicitly and return 401.

---

## 5. Behaviour changes

Everything here is a deliberate fix or a strict improvement. Nothing else in
the request/response contract moved.

### 5.1 Fixed: paginated list endpoints crashed without explicit query params

`GET /api/v1/products` (and inventory `…/history`, `…/reservations`) built
`LIMIT $n OFFSET $n` from `req.query.limit` / `req.query.page`. Because
`validate()` discarded Zod's coerced-and-defaulted output — and Express 5
makes `req.query` read-only, so it could not be written back — those values
arrived as `undefined`, making `offset` `NaN`. Reading from `req.validated`
means the documented defaults (`page=1`, `limit=20`, `sortBy=createdAt`,
`sortDir=desc`) now actually apply. Verified in §6.

### 5.2 Fixed: `POST /api/v1/otp/request` always returned 500

`OtpService.requestOtp` called
`eventPublisher.publish("domain-events", "auth.otp.required", {...})` —
three positional arguments against a publisher that takes one object. The
destructured `eventId` was `undefined`, so `EventPublisher` threw its
"requires a stable eventId" guard on every call (and `"domain-events"` is not
an exchange this topology declares any more). It now publishes a proper
event:

```ts
{ eventId: crypto.randomUUID(), module: identity,
  eventName: AuthOtpRequired, routingKey: auth.otp.required, payload: { email, otp } }
```

Kept as a direct publish rather than an outbox write, deliberately: an OTP is
only useful for a few minutes and has no committed database state to stay
consistent with. The routing key is unchanged, and
`RabbitQueues.NOTIFICATION_OTP_REQUIRED` + `OtpRequiredConsumer` are still
un-registered in `registerMessaging` — wiring them is a follow-up, not part of
this migration.

### 5.3 Fixed: `AuthService.requestOtp` called a method that does not exist

It called `otpService.generateOtp(...)`, which was never implemented — the
method would have thrown a `TypeError` if anything had reached it (no route
does; `OtpController` uses `OtpService` directly). It now delegates to
`otpService.requestOtp()`, so the OTP is generated, stored and announced in
one place.

### 5.4 Fixed: Postgres was never closed on shutdown

`registerGracefulShutdown` guarded every step with `if (postgres?.disconnect)`
— but `PostgresClient` only had `close()`, so that branch was always skipped
and the pool leaked on SIGTERM. The shutdown targets are now typed, the
optional-call guards are gone, and `PostgresClient` exposes `disconnect()` as
an alias of `close()` for symmetry with the Redis and Rabbit clients.

### 5.5 Changed: `RoleService` / `PermissionService` now return 4xx, not 500

They threw bare `new Error("Role already exists")` / `"Permission not found"`,
which the error handler could only treat as an unexpected fault → **500**. They
now throw `ConflictError` (409) and `NotFoundError` (404), matching every
other service in the codebase. Callers of these admin endpoints will see the
corrected status codes.

### 5.6 Changed: unexpected errors are logged through the logger

`registerErrorHandlers` used `console.error(error)`. It now uses
`logger.error`, so an unhandled fault is structured JSON carrying the
`requestId` like every other log line. The client still gets exactly
`{ success: false, message: "Internal server error" }`.

### 5.7 Changed: `logger.error(message, meta)` — one signature for all levels

`error()` used to be `(message, error = null, meta = {})`, and every existing
call passed its fields in the *`error`* slot, which nested them under an
`error` key. It is now `(message, meta)` like `info`/`warn`/`debug`/`fatal`, so
those fields land at the top level (`error: "…"`, `stack: "…"`). Log **shape**
changes; nothing functional does. The HTTP access log, which previously nested
`method`/`url`/`statusCode` under `error`, is correct as a result.

### 5.8 Changed: JWT secrets are validated at boot

`config/jwt.ts` now throws if `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` is
missing, matching what `config/postgres.ts` already did for the database
variables. Previously a missing secret surfaced as a per-request
`jwt.sign` failure. Both are present in `.env.example`.

### 5.9 Small clean-ups

- `SessionRepository.deleteExpiredSessions()` was a byte-identical duplicate
  of `deleteExpired()` with no callers; removed.
- `SocketServer.getIO()` returned `null` before `initialize()`; it now throws
  `InternalServerError`, so callers cannot deref `null`.
- `SocketAuthMiddleware` imported `../errors/UnauthorizedError` — a path that
  does not exist. Fixed to `../../shared/errors/UnauthorizedError` (the file is
  not yet wired into `SocketServer`, which is why it never crashed).
- `SmsService` used `console.log`; it now uses the logger.
- `NotificationService.sendOtpNotification()` was referenced by
  `OtpRequiredConsumer` but never implemented; implemented.
- Singletons (`PostgresClient`, `RedisClient`, `RabbitMQClient`, `Logger`,
  `SocketServer`) had a `constructor` that returned a *different* instance when
  one already existed. They now use a private constructor plus
  `getInstance()` — same behaviour, without a constructor that lies about what
  it returns.
- `PublishOutboxJob.handle()` no longer takes an unused `job` argument.

### 5.10 Demonstrated pre-existing bug, left as-is (needs a product decision)

`TokenService.generateAccessToken` and `generateRefreshToken` sign payloads
with no unique claim (`{userId, roleId, tokenVersion, type}` and
`{userId, type}`), and JWT `iat` has one-second resolution. **Two tokens
minted for the same user within the same second are therefore byte-identical.**
Confirmed against the live server:

```
two logins in the same second produce identical access tokens: true
...and identical refresh tokens: true
```

Two concrete consequences, both pre-existing (the JS payloads were the same):

1. **Logout can invalidate a later, legitimate login.** `logout` blacklists the
   access token string in Redis; a login in that same second returns the *same*
   string, which is already blacklisted, so the fresh session is rejected with
   401. This is how the bug surfaced — it broke a test that logged out and
   immediately logged back in.
2. **Refresh-token rotation can be a no-op.** `rotateRefreshToken` re-stores
   the same digest, so the "old" refresh token stays valid.

The fix is a unique claim (`jti: crypto.randomUUID()`) in both payloads. That
changes what an issued credential contains, so it is flagged rather than
changed as part of a type migration. Both facts are pinned by tests, so a
future fix will show up as those tests changing.

### 5.11 Fixed: `npm run migrate` failed on any already-migrated database

Found while verifying against live Postgres. Migration `003` was a bare
`ALTER TABLE outbox_events RENAME COLUMN exchange TO module`, and the runner
has no ledger — it replays the whole directory every time. Every other
migration is idempotent (`CREATE TABLE IF NOT EXISTS`, a guarded
`ADD CONSTRAINT`), so `003` was the only statement that could not be replayed:
on a database that had already been migrated it aborted the run with
`column "exchange" does not exist`, taking `004`–`006` with it.

It is now wrapped in the same `DO $$ … IF EXISTS … END $$` guard style already
used by `001`. Verified both ways: it applies cleanly to a brand-new database
(the rename runs) and to the already-migrated one (the rename is skipped).

A migration ledger table is still the real fix — see §7.

---

## 6. Verification

### 6.1 Compile

- `npm run typecheck` — clean under `strict` plus the four extra checks.
- `npm run build` — 187 files emitted to `dist/`.
- The compiled graph loads: `registerDependencies()` from `dist/` constructs
  every object and fails only where it must without a broker
  (`RabbitMQ not connected`), proving every import path and constructor
  signature resolves in the build output.

### 6.2 Offline behaviour (59 checks, in-memory repositories)

Real HTTP requests through the real Express app — real middleware, real
validators, real error handler — with fake repositories. This is only possible
because of the interfaces in §2.3.

- *Catalog / HTTP* — query defaults and coercion; `limit=9999` → 400 naming
  `query.limit`; bad uuid → 400 naming `params.id`; unknown id → 404; bad SKU →
  400 naming `body.sku`; empty PATCH body → 400; `DRAFT → INACTIVE` → 409;
  `DRAFT → ACTIVE` → 200; DTO image ordering; slugify; the update builder's
  allow-list (an `evil` key is dropped); row/pagination helpers; topology
  naming; JWT round-trip incl. tamper and wrong-token-type rejection.
- *Inventory* — reserve moves available→reserved and emits `InventoryReserved`;
  a shortage compensates, leaves stock untouched and emits
  `InventoryReservationFailed`; release returns stock and is idempotent;
  confirm consumes reserved without touching available; increase/decrease/
  adjust guards; `InventoryLow` under the threshold.
- *Identity + messaging* — bcrypt at rest; digest-only refresh storage; OTP
  single-use; unknown auth type rejected; blacklist and `tokenVersion`
  invalidation; inbox dedup incl. same-event-different-queue; outbox retry
  semantics; retry-then-DLQ escalation.

### 6.3 Live stack (45 checks, real Postgres + Redis + RabbitMQ)

`docker compose -f docker/docker-compose.yml up -d`, then `npm run migrate`,
the three seeds, and `node dist/server.js` — the **compiled** output, not tsx.
All 45 pass.

Startup confirmed the full topology: Redis connected, four consumers started
(`notification.user.registered`, `inventory.product.created`,
`inventory.order.created`, `inventory.order.cancelled`), messaging
initialised, socket server up, outbox worker started, BullMQ repeatable job
scheduled, HTTP listening.

What the live run proves that the offline run cannot:

**Migrations and seeds** — all six migrations apply to a brand-new database and
re-apply to an already-migrated one (§5.11); all three seeds run, leaving
admin with 26 permissions and customer with 2.

**Real SQL** — the dynamic `SET` builder, the recursive category CTE, the
`COUNT(*) OVER()` pagination, `ILIKE` filters, the sort allow-list, JSONB
round-tripping (`metadata: {color:"red"}` came back intact) and every
`RETURNING` projection all execute against Postgres.

**The §5.1 pagination fix, for real** — `GET /api/v1/products` with no query
string returns `{page: 1, limit: 20, …}` and a populated page. Before the fix
this reached Postgres as `LIMIT NaN OFFSET NaN`.

**Optimistic locking** — `increase` → 50 available with `version` incremented;
`decrease` → 40; `adjust -5` → 35; over-decrease → 409; `quantityDelta: 0` →
400.

**Cross-module event flow, end to end through RabbitMQ:**

- `POST /products` → outbox row → the worker publishes → `ProductCreated`
  lands on `inventory.product.created` → `ProductCreatedConsumer` creates the
  inventory row (0/0, version 1) and one `INITIAL` ledger entry → the inbox row
  for that queue is `PROCESSED`. The inbox `eventId` equals the outbox row id,
  which is the whole point of that design.
- `POST /auth/register` → `UserRegistered` → the notification consumer's inbox
  row reaches `PROCESSED`.
- An `OrderCreated` envelope published directly onto `ordering.exchange`
  reserved 4 units: 35 → 31 available, 4 reserved, reservation `RESERVED` with
  a TTL, `RESERVATION` ledger entry, and `InventoryReserved` published back
  onto the bus.
- **Inbox dedup under real redelivery** — republishing the *same* `eventId`
  created no second reservation and left both counters unchanged.
- `OrderCancelled` → reservation `RELEASED`, stock back to 35/0, exactly the
  `RESERVATION` + `RELEASE` pair in the ledger.
- An order for 100 000 units → reservation `FAILED`, stock untouched, and
  `InventoryReservationFailed` carrying
  `{reason: "INSUFFICIENT_STOCK", requested: 100000, available: 35}`.
- Decreasing past the threshold emitted `InventoryLow`
  (`availableQuantity: 5, threshold: 10`).
- The outbox fully drained — zero unprocessed rows at the end.

**Auth against real Redis** — the OTP is cached at `identity:otp:<email>` with
a TTL ≤ 300s and is single-use (second attempt → 403); logout blacklists the
token in Redis and the next request is 401; logout-all bumps `tokenVersion`,
drops every session row, and invalidates outstanding tokens; a customer-role
user gets `403 Missing permission: brand:create`.

**Product lifecycle** — `DRAFT → ACTIVE → INACTIVE → ACTIVE`, illegal
transitions 409, archive terminal, archived products reject edits but still
read; images add/replace/remove keep contiguous positions; brands and
categories with dependents refuse deletion (409); the category tree nests
correctly.

**Graceful shutdown** — verified against live infrastructure, with the
sequence completing and exit code 0:

```
Received SIGTERM. Starting graceful shutdown...
HTTP server closed -> Socket server closed -> Workers stopped ->
RabbitMQ disconnected -> Redis disconnected -> PostgreSQL disconnected ->
Graceful shutdown complete
```

That last-but-one line is the §5.4 fix: the old `PostgresClient` had no
`disconnect` method at all, so `if (postgres?.disconnect)` was always false and
the pool leaked on every shutdown. (Windows does not deliver a POSIX SIGTERM
that runs Node handlers, so the signal was raised in-process; every client the
handler closes was real.)

### 6.4 Not covered

Retry/DLQ escalation was exercised offline against a fake channel but not
end-to-end on a live broker (it needs a deliberately failing consumer and a
~15s TTL wait). Concurrency was not load-tested: the optimistic-locking retry
loop is correct by construction and unit-verified, but real contention on one
hot product row is untested. There is still no automated suite in the repo —
see §7.

## 7. Suggested follow-ups

1. **Commit the verification suites.** The 59 offline checks and 45 live checks
   exist as harnesses outside the repo; `tests/` is still empty. Landing them
   as Vitest (offline as unit/integration, live behind a docker-compose CI job)
   would make everything in §6 a regression gate.
2. **Give tokens a `jti`** (§5.10) — a demonstrated bug with two real
   consequences.
3. **Add a migration ledger** (§5.11). Idempotent-by-convention migrations work
   until someone writes a statement that cannot be replayed; a
   `schema_migrations` table applying each file once, in a transaction, removes
   the convention.
4. Register `RabbitQueues.NOTIFICATION_OTP_REQUIRED` → `OtpRequiredConsumer` in
   `registerMessaging`, so `AuthOtpRequired` has a subscriber. It is currently
   published to `identity.exchange` with no bound queue, so the OTP is only
   reachable from Redis.
5. Add the reservation expiry sweep — `ReservationService.findExpired()` and
   `markExpired()` exist but nothing calls them, so a `RESERVED` reservation
   whose TTL passes holds its stock forever.
6. Schedule `CleanupExpiredSessionsJob`; it is implemented but never registered
   in `registerJobs`.
7. Move `INVENTORY_LOW_STOCK_THRESHOLD` from one env-wide value to a
   per-product column.
8. Add ESLint (`@typescript-eslint`) and Prettier to CI alongside
   `npm run typecheck`.
