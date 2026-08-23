# Building the Same Backend as a Plain Monolith (No Event-Driven Architecture)

This is a build-it-from-scratch guide. It describes how to design a complete,
production-shaped Node.js + TypeScript + Postgres backend — the same feature set
this repo has (auth, catalog, inventory, ordering, notifications) — but with
**every module calling other modules directly** instead of publishing events
through RabbitMQ.

**Who this is for:** a developer who can write an Express route and a SQL query,
and now needs to lay out a whole backend without it turning into spaghetti after
three months.

**What you get by the end:** a folder structure, the seven layers a request
passes through, the exact rules for how modules are allowed to talk to each
other, and a repeatable checklist for adding any new feature.

> The companion doc [docs.md](docs.md) explains the event-driven design this repo
> actually uses. Read this one first if you are new — the direct-call monolith is
> the simpler thing, and event-driven architecture makes far more sense once you
> know what problem it is solving.

---

## Table of contents

1. [Start here: what actually changes without events](#1-start-here-what-actually-changes-without-events)
2. [The four rules everything else follows](#2-the-four-rules-everything-else-follows)
3. [Folder structure](#3-folder-structure)
4. [The seven layers of a request](#4-the-seven-layers-of-a-request)
5. [Contracts: the file that makes modules replaceable](#5-contracts-the-file-that-makes-modules-replaceable)
6. [How modules talk to each other (the important chapter)](#6-how-modules-talk-to-each-other-the-important-chapter)
7. [Transactions: one unit of work per use case](#7-transactions-one-unit-of-work-per-use-case)
8. [Background work without a message broker](#8-background-work-without-a-message-broker)
9. [Concurrency: two people, one last item in stock](#9-concurrency-two-people-one-last-item-in-stock)
10. [Errors: one way to fail](#10-errors-one-way-to-fail)
11. [Validation at the edge](#11-validation-at-the-edge)
12. [Wiring it all up: the composition root](#12-wiring-it-all-up-the-composition-root)
13. [Database and migration conventions](#13-database-and-migration-conventions)
14. [Testing strategy](#14-testing-strategy)
15. [A full worked example: place an order](#15-a-full-worked-example-place-an-order)
16. [The add-a-feature checklist](#16-the-add-a-feature-checklist)
17. [Anti-patterns to refuse in code review](#17-anti-patterns-to-refuse-in-code-review)
18. [What you gave up, and when to add events back](#18-what-you-gave-up-and-when-to-add-events-back)
19. [Day-one starter skeleton](#19-day-one-starter-skeleton)

---

## 1. Start here: what actually changes without events

In the event-driven version of this backend, when an order is created, the
Ordering module does **not** touch inventory. It writes a row saying
`order.created` happened, and the Inventory module — which subscribed to that
announcement — later picks it up and reserves stock.

In the direct-call monolith, Ordering just... calls Inventory.

```ts
// Event-driven: Ordering announces, and walks away.
await this.outboxService.addEvent(OrderCreated.build(order), tx);

// Direct call: Ordering asks Inventory to do the thing, right now.
await this.inventoryService.reserveStock({ orderId: order.id, items }, tx);
```

That one line is the whole architectural difference. Everything below is about
making that line **safe** — so that "just call it directly" does not degrade into
every module importing every other module.

### Side-by-side

| Concern | Event-driven (this repo today) | Direct-call monolith (this guide) |
|---|---|---|
| Ordering to Inventory | `order.created` event, then `OrderCreatedConsumer` | `inventoryService.reserveStock(cmd, tx)` |
| Who knows about whom | Ordering knows nothing about Inventory | Ordering knows an **interface** Inventory implements |
| Failure of the second step | Order succeeds, reservation retries later | Whole request fails and rolls back together |
| Consistency | Eventual (milliseconds to seconds) | Immediate, one Postgres transaction |
| Moving parts | Postgres + RabbitMQ + outbox + inbox + workers | Postgres |
| Debugging a bug report | Trace an event across queues and logs | One stack trace |
| Adding a 4th reaction to an order | New consumer, zero changes to Ordering | Ordering's use case gains one more call |
| Slow side effects (email) | Free, already async | Needs a jobs table (section 8) |

### Which one should a new project pick?

Pick the direct-call monolith. Almost always, at the start.

You can build the event-driven version later, module by module, *because* the
layering below keeps business logic free of both RabbitMQ and direct imports.
What you must not do is start with RabbitMQ "to be ready to scale" and end up
with five queues, an inbox table, and 200 daily users.

---

## 2. The four rules everything else follows

Memorise these. Ninety percent of design questions answer themselves once you
apply them.

### Rule 1 — Dependencies point inward, never outward

```
  routes -> controllers -> services -> repositories -> Postgres
     (HTTP stuff)          (business rules)    (SQL stuff)
```

- A **service** contains business rules. It must not know that HTTP exists (no
  `req`, no `res`, no status codes) and must not know that `pg` exists (no SQL
  strings, no `pool.query`).
- A **repository** knows SQL and nothing else. It must not throw
  `ConflictError`, apply business rules, or decide what a valid state change is.
- A **controller** knows HTTP and nothing else. It maps a request into a service
  call and a result into a response body.

If you can answer *"which layer does this belong to?"* for every line you write,
your code will stay navigable at 50,000 lines.

### Rule 2 — Depend on interfaces, not on classes

A service never imports another module's class. It imports an **interface** from
that module's `contracts.ts`, and the concrete class is handed to it at startup.

```ts
// ordering/services/PlaceOrderService.ts
import type { IStockReserver } from "../../inventory/contracts"; // the interface
// NOT: import { InventoryService } from "../../inventory/services/InventoryService";
```

`import type` is erased at compile time, so there is not even a runtime require
between the two modules. That is what keeps a module extractable into its own
service later.

### Rule 3 — Modules form a one-way stack

Assign every module a level. **A module may only call downward.**

```
level 3   ordering        (uses catalog, inventory, identity)
level 2   inventory       (uses catalog)
level 1   catalog         (uses identity for permissions only)
level 0   identity        (uses nobody)
level 0   notification    (uses nobody, it is only ever called)
```

Two modules calling each other is the single most damaging mistake you can make
in a monolith: it makes them one module wearing two hats, forever. If you feel
the need for an upward call, section 6.4 shows the three legal ways out.

### Rule 4 — One request, one transaction, decided at the top

The **use case** (the service method the controller calls) opens the
transaction. Everything it touches — its own tables and any other module's
tables — receives that same `tx` handle and joins the same all-or-nothing unit.
Repositories never open transactions on their own.

---

## 3. Folder structure

```
src/
├── server.ts                       # process entry: connect, wire, listen
│
├── app/                            # the Express application
│   ├── createApp.ts                # builds the app from a container
│   ├── registerMiddleware.ts       # cors, json, request-id, access log
│   ├── registerRoutes.ts           # mounts every module under /api/v1
│   └── registerErrorHandlers.ts    # the single error exit point
│
├── bootstrap/
│   ├── container.ts                # the shape of the wired app (types only)
│   ├── registerDependencies.ts     # the composition root: new-up everything
│   ├── registerJobs.ts             # start the background job runner
│   └── registerGracefulShutdown.ts # SIGTERM: stop accepting, drain, close
│
├── config/                         # env into typed config objects
│   ├── postgres.ts
│   └── jwt.ts
│
├── infrastructure/                 # things that talk to the outside world
│   ├── postgres/
│   │   ├── PostgresClient.ts               # the one connection pool
│   │   └── PostgresTransactionManager.ts   # BEGIN / COMMIT / ROLLBACK
│   ├── logging/
│   │   ├── Logger.ts
│   │   └── RequestContextMiddleware.ts     # per-request correlation id
│   └── jobs/
│       ├── JobRepository.ts                # the jobs table
│       └── JobRunner.ts                    # the in-process poller
│
├── modules/                        # one folder per business capability
│   ├── identity/
│   ├── catalog/
│   ├── inventory/
│   ├── ordering/
│   └── notification/
│
├── shared/                         # used by two or more modules
│   ├── contracts.ts                # ports shared app-wide (cache, jobs, ...)
│   ├── errors/                     # AppError plus one subclass per status code
│   ├── types/                      # database.ts, http.ts, pagination.ts, entities.ts
│   ├── utils/                      # rows.ts, sqlUpdate.ts, slugify.ts
│   └── validators/validate.ts      # the Zod middleware
│
├── database/migrations/            # 001_identity.sql, 002_catalog.sql, ...
└── scripts/                        # migrate.ts, seed*.ts
```

Inside every module, the same eight folders — always the same names, so any
developer can find anything in any module without looking:

```
modules/catalog/
├── contracts.ts        # this module's public interfaces plus input/output types
├── routes/             # URL, middleware, controller method
│   ├── index.ts        # the module's route groups, as data
│   └── product.routes.ts
├── validators/         # one Zod schema per endpoint
├── controllers/        # HTTP in, DTO out
├── dto/                # request to command, and entity to response shapes
├── services/           # business rules (the interesting code)
├── repositories/       # SQL
└── constants/          # enums, status transition tables
```

**Rule of thumb: one class per file, named exactly like the file.**
`ProductService` lives in `ProductService.ts`. No `utils.ts` dumping grounds, and
no `index.ts` re-export barrels except for route groups.

---

## 4. The seven layers of a request

Let us follow `POST /api/v1/products` all the way down. Each layer gets a short
"why it exists" and real code.

### 4.1 Route — the wiring, and nothing else

A route file is a table of contents. It contains no logic: only *which*
middleware runs in *what* order before *which* controller method.

```ts
// modules/catalog/routes/product.routes.ts
import { Router } from "express";

import { validate } from "../../../shared/validators/validate";
import type { JwtMiddleware } from "../../identity/middleware/JwtMiddleware";
import type { PermissionMiddleware } from "../../identity/middleware/PermissionMiddleware";

import type { ProductController } from "../controllers/ProductController";
import { CreateProductValidator } from "../validators/CreateProductValidator";
import { ProductQueryValidator } from "../validators/ProductQueryValidator";

/**
 * Exactly what this route group needs, nothing more. Declaring it as an
 * interface means a route file cannot quietly start using a service it
 * never asked for.
 */
export interface ProductRouteDependencies {
  productController: ProductController;
  jwtMiddleware: JwtMiddleware;
  permissionMiddleware: PermissionMiddleware;
}

export function productRoutes({
  productController,
  jwtMiddleware,
  permissionMiddleware,
}: ProductRouteDependencies): Router {
  const router = Router();

  router.post(
    "/",
    jwtMiddleware.authenticate.bind(jwtMiddleware),   // who are you?
    permissionMiddleware.require("product:create"),   // are you allowed?
    validate(CreateProductValidator),                 // is the input sane?
    productController.create.bind(productController), // do the thing
  );

  router.get(
    "/",
    validate(ProductQueryValidator),
    productController.list.bind(productController),
  );

  return router;
}
```

Two details worth internalising:

- **`.bind(...)` is mandatory.** Passing `productController.create` alone loses
  `this`, and the handler crashes on its first `this.productService`.
- **Read the middleware chain top to bottom as a sentence.** Authenticate, then
  authorise, then validate, then handle. If a route's chain reads oddly, it
  usually *is* odd.

Each module exposes its route groups as plain data, so mounting a new module is a
one-line change in `app/registerRoutes.ts`:

```ts
// modules/catalog/routes/index.ts
export function catalogRoutes(deps: CatalogRouteDependencies): RouteDefinition[] {
  return [
    { path: "/products",   router: productRoutes(deps) },
    { path: "/categories", router: categoryRoutes(deps) },
    { path: "/brands",     router: brandRoutes(deps) },
  ];
}
```

### 4.2 Validator — reject bad input before it reaches your logic

One Zod schema per endpoint, validating `body`, `params` and `query` together.
The schema is also the **source of the TypeScript type**, so the two can never
drift apart.

```ts
// modules/catalog/validators/CreateProductValidator.ts
import { z } from "zod";

export const CreateProductValidator = z.object({
  body: z.object({
    sku: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(255),
    shortDescription: z.string().trim().max(500).nullish(),
    categoryId: z.uuid("Invalid categoryId").nullish(),
    brandId: z.uuid("Invalid brandId").nullish(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    images: z
      .array(
        z.object({
          imageUrl: z.url(),
          altText: z.string().trim().max(255).nullish(),
        }),
      )
      .default([]),
  }),
});

// One export, used by the controller. Change the schema, the type changes.
export type CreateProductInput = z.infer<typeof CreateProductValidator>;
```

For list endpoints, the schema also **coerces and defaults** — which is why the
controller must read the parsed output, not `req.query`:

```ts
page:    z.coerce.number().int().min(1).default(1),      // "?page=2" becomes 2
limit:   z.coerce.number().int().min(1).max(100).default(20),
sortBy:  z.enum(["name", "sku", "createdAt"]).default("createdAt"),
sortDir: z.enum(["asc", "desc"]).default("desc"),
```

Note `sortBy` is an `enum`, not a `string`. A client can never name a column that
is not on that list — the first of two defences against ORDER BY injection (the
second is in section 4.7).

The middleware that runs it, written once:

```ts
// shared/validators/validate.ts
export function validate<S extends ZodType>(schema: S): RequestHandler {
  return (req, _res, next) => {
    try {
      // Store the PARSED output. That is where the coercions and defaults are.
      req.validated = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        next(new BadRequestError("Validation failed", errors));
        return;
      }
      next(error);
    }
  };
}

/** Typed read-back, used by controllers. */
export function validated<T>(req: Request): T {
  if (req.validated === undefined) {
    throw new InternalServerError(
      "Route reads validated input but is not mounted behind validate()",
    );
  }
  return req.validated as T;
}
```

That last guard is a small thing that saves real time: forgetting `validate()` on
a route becomes a loud 500 with an explanatory message instead of a confusing
`Cannot read properties of undefined`.

### 4.3 Controller — translate, do not think

A controller method should be boring enough to review in five seconds: read
validated input, map it, call one service method, return a DTO.

```ts
// modules/catalog/controllers/ProductController.ts
export class ProductController {
  private readonly productService: ProductService;

  constructor(productService: ProductService) {
    this.productService = productService;
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { body } = validated<CreateProductInput>(req);

      const command = CreateProductDto.fromRequest(body);

      const product = await this.productService.createProduct(command);

      return res.status(201).json(ProductResponseDto.fromEntity(product));
    } catch (error) {
      next(error); // never format an error here, see section 10
    }
  }
}
```

Things that must **never** appear in a controller: a SQL query, a
`transactionManager` call, an `if` about business rules, or a second service call
that has to succeed or fail together with the first. That last one is the most
tempting and the most damaging — if two calls must be atomic, they belong in one
service method (section 7).

### 4.4 DTO — the boundary contract, in both directions

Two directions, two jobs.

**Inbound** (`CreateProductDto`): turn a loose HTTP body into a precise command
object your service wants, normalising `undefined` into `null`, trimming,
defaulting.

```ts
// modules/catalog/dto/CreateProductDto.ts
export class CreateProductDto {
  static fromRequest(body: CreateProductInput["body"]): CreateProductCommand {
    return {
      sku: body.sku,
      name: body.name,
      shortDescription: body.shortDescription ?? null,
      description: body.description ?? null,
      categoryId: body.categoryId ?? null,
      brandId: body.brandId ?? null,
      metadata: body.metadata ?? {},
      images: (body.images ?? []).map((image) => ({
        imageUrl: image.imageUrl,
        altText: image.altText ?? null,
      })),
    };
  }
}
```

**Outbound** (`ProductResponseDto`): choose explicitly which fields the world
sees.

```ts
// modules/catalog/dto/ProductResponseDto.ts
export class ProductResponseDto {
  static fromEntity(product: ProductAggregateRow): ProductResponse {
    return {
      id: product.id,
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      status: product.status,
      category: product.category ?? null,
      brand: product.brand ?? null,
      images: [...product.images]
        .sort((a, b) => a.position - b.position)
        .map(({ id, imageUrl, altText, position }) => ({
          id, imageUrl, altText, position,
        })),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  static fromList(products: ProductAggregateRow[]): ProductResponse[] {
    return products.map((product) => ProductResponseDto.fromEntity(product));
  }
}
```

**Never `res.json(row)`.** It looks like a harmless shortcut and it is how
`passwordHash` columns end up in public API responses. It also means every
`ALTER TABLE` is silently a breaking API change. An explicit DTO costs ten lines
and removes both problems permanently.

### 4.5 Service — where the actual thinking lives

The service is the only layer allowed to have opinions. Everything else is
plumbing. Its job:

1. Enforce the rules ("SKU must be unique", "an archived product is read-only").
2. Sequence the work (validate, write, write again).
3. Own the transaction boundary.
4. Call other modules, through their interfaces.

```ts
// modules/catalog/services/ProductService.ts

export interface ProductServiceDependencies {
  productRepository: IProductRepository;
  categoryRepository: ICategoryRepository;
  brandRepository: IBrandRepository;
  transactionManager: ITransactionManager;
}

export class ProductService {
  private readonly productRepository: IProductRepository;
  private readonly categoryRepository: ICategoryRepository;
  private readonly brandRepository: IBrandRepository;
  private readonly transactionManager: ITransactionManager;

  // Object destructuring, not positional args: adding a 5th dependency later
  // does not force you to re-read every `new ProductService(a, b, c, d)`.
  constructor({
    productRepository,
    categoryRepository,
    brandRepository,
    transactionManager,
  }: ProductServiceDependencies) {
    this.productRepository = productRepository;
    this.categoryRepository = categoryRepository;
    this.brandRepository = brandRepository;
    this.transactionManager = transactionManager;
  }

  async createProduct(data: CreateProductCommand): Promise<ProductAggregateRow> {
    // 1. Rules first, cheapest first.
    if (await this.productRepository.exists({ sku: data.sku })) {
      throw new ConflictError(`SKU '${data.sku}' already exists`);
    }
    if (data.categoryId) await this.assertCategoryExists(data.categoryId);
    if (data.brandId)    await this.assertBrandExists(data.brandId);

    const slug = await this.generateUniqueSlug(data.name);

    // 2. All writes in one transaction.
    const created = await this.transactionManager.execute(async (tx) => {
      const product = await this.productRepository.create(
        { ...data, slug, status: ProductStatus.DRAFT },
        tx,
      );

      if (data.images.length > 0) {
        await this.productRepository.addImages(product.id, data.images, tx);
      }

      return product;
    });

    // 3. Re-read the full aggregate for the response.
    return this.requireAggregate(created.id);
  }

  /* ---- small private helpers keep the public methods readable ---- */

  private async requireProduct(id: string): Promise<ProductRow> {
    const product = await this.productRepository.findRawById(id);
    if (!product) throw new NotFoundError("Product not found");
    return product;
  }

  /** Archived products are read-only: nothing may mutate them further. */
  private async requireEditableProduct(id: string): Promise<ProductRow> {
    const product = await this.requireProduct(id);
    if (product.status === ProductStatus.ARCHIVED) {
      throw new ConflictError("Cannot modify an archived product");
    }
    return product;
  }
}
```

Two habits from this example that pay off enormously.

**Name your guards.** `requireProduct`, `requireEditableProduct`,
`assertCategoryExists`. A method that starts with three named guard calls
documents its own preconditions.

**Express state machines as data, not as `if`s.** The product lifecycle is a
table, and TypeScript checks its exhaustiveness for you:

```ts
// modules/catalog/constants/ProductStatus.ts
export const ProductStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;

export type ProductStatusValue = (typeof ProductStatus)[keyof typeof ProductStatus];

/** Any transition not listed here is rejected. ARCHIVED is terminal. */
export const PRODUCT_STATUS_TRANSITIONS: Record<
  ProductStatusValue,
  readonly ProductStatusValue[]
> = {
  DRAFT:    [ProductStatus.ACTIVE, ProductStatus.ARCHIVED],
  ACTIVE:   [ProductStatus.INACTIVE, ProductStatus.ARCHIVED],
  INACTIVE: [ProductStatus.ACTIVE, ProductStatus.ARCHIVED],
  ARCHIVED: [],
};

export function canTransition(from: ProductStatusValue, to: ProductStatusValue) {
  return PRODUCT_STATUS_TRANSITIONS[from].includes(to);
}
```

Add a fifth status to the union and forget its row, and you get a **compile
error**. The same rule written as nested `if`s would have failed silently in
production instead.

### 4.6 Repository — SQL, and only SQL

One repository per aggregate. Every method takes an optional transaction and uses
the same one-line idiom, so it behaves identically inside or outside a
transaction:

```ts
// modules/catalog/repositories/ProductRepository.ts
export class ProductRepository implements IProductRepository {
  private readonly db: QueryExecutor;

  constructor(db: QueryExecutor) {
    this.db = db;
  }

  async create(
    input: CreateProductInput,
    tx: MaybeTransaction = null,
  ): Promise<ProductRow> {
    const executor = tx ?? this.db; // the idiom, in every method

    const result = await executor.query<ProductRow>(
      `
        INSERT INTO products (sku, slug, name, "categoryId", "brandId", status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        input.sku, input.slug, input.name,
        input.categoryId, input.brandId, input.status,
        JSON.stringify(input.metadata),
      ],
    );

    return firstOrFail(result, "ProductRepository.create");
  }

  async findRawById(id: string, tx: MaybeTransaction = null) {
    const executor = tx ?? this.db;
    const result = await executor.query<ProductRow>(
      `SELECT * FROM products WHERE id = $1`,
      [id],
    );
    return firstOrNull(result);
  }
}
```

The type that makes `tx ?? this.db` legal is the narrow slice both the pool and a
checked-out client satisfy:

```ts
// shared/types/database.ts
export interface QueryExecutor {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<R>>;
}

export type Transaction = PoolClient;
export type MaybeTransaction = Transaction | null;

export interface ITransactionManager {
  execute<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;
}
```

Two more repository rules.

**Always parameterise.** `$1`, `$2`, never string concatenation of user input.
The only thing that may be interpolated into SQL text is a value you looked up in
a hard-coded map (section 4.7).

**Say what you expect from a result.** Three helpers, written once, resolve the
"is `rows[0]` there or not?" question at the point where you actually know the
answer:

```ts
// shared/utils/rows.ts
/** Zero or one row expected: a finder. */
export function firstOrNull<R extends QueryResultRow>(r: QueryResult<R>): R | null {
  return r.rows[0] ?? null;
}

/** Exactly one row guaranteed by the statement (INSERT ... RETURNING).
 *  Missing means code and SQL have drifted: a defect, not a 404. */
export function firstOrFail<R extends QueryResultRow>(r: QueryResult<R>, context: string): R {
  const row = r.rows[0];
  if (!row) throw new InternalServerError(`${context}: expected a row, got none`);
  return row;
}

/** Splits `SELECT *, COUNT(*) OVER() AS "totalCount"` into page plus total. */
export function toPage<R extends QueryResultRow>(
  r: QueryResult<R & { totalCount: string }>,
): { items: R[]; total: number } {
  const total = r.rows[0] ? Number(r.rows[0].totalCount) : 0;
  const items = r.rows.map(({ totalCount: _drop, ...rest }) => rest as unknown as R);
  return { items, total };
}
```

### 4.7 Two recurring SQL problems, solved once

Every project rediscovers these. Solve them in `shared/utils/` on day one.

**Problem: paginated search with optional filters.** Build the WHERE clause and
the parameter array together, and get the total from a window function so you
need one query instead of two:

```ts
async search(q: ProductSearchQuery, tx: MaybeTransaction = null): Promise<Page<ProductRow>> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q.name) {
    params.push(`%${q.name}%`);
    conditions.push(`p.name ILIKE $${params.length}`); // index tracks params
  }
  if (q.categoryId) {
    params.push(q.categoryId);
    conditions.push(`p."categoryId" = $${params.length}`);
  }
  if (q.status) {
    params.push(q.status);
    conditions.push(`p.status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // Defence #2 against ORDER BY injection: a client string is only ever a KEY
  // into this hard-coded map. It never reaches the SQL text itself.
  const SORTABLE = {
    name: "p.name", sku: "p.sku", createdAt: 'p."createdAt"',
  } as const;
  const column = q.sortBy ? SORTABLE[q.sortBy] : 'p."createdAt"';
  const direction = q.sortDir === "asc" ? "ASC" : "DESC";

  params.push(q.limit);                 const limitIndex = params.length;
  params.push((q.page - 1) * q.limit);  const offsetIndex = params.length;

  const executor = tx ?? this.db;
  const result = await executor.query(
    `
      SELECT p.*, COUNT(*) OVER() AS "totalCount"
      FROM products p
      ${where}
      ORDER BY ${column} ${direction}
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `,
    params,
  );

  return toPage(result);
}
```

**Problem: partial updates (PATCH).** Do not write sixteen UPDATE statements.
Turn a patch object into a SET clause, allow-listing keys through a column map:

```ts
// shared/utils/sqlUpdate.ts
export function buildUpdateAssignments<TPatch extends object>(
  fields: TPatch,
  columnMap: Partial<Record<keyof TPatch & string, string>>,
  options: { firstParamIndex?: number; encoders?: ValueEncoders<TPatch> } = {},
): { assignments: string[]; values: unknown[] } {
  const { firstParamIndex = 2 } = options;   // $1 is the id in WHERE
  const encoders = options.encoders ?? {};
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const key of Object.keys(fields) as (keyof TPatch & string)[]) {
    const column = columnMap[key];
    if (!column) continue;                   // unknown key, silently ignored
    const encode = encoders[key];
    assignments.push(`${column} = $${firstParamIndex + values.length}`);
    values.push(encode ? encode(fields[key]) : fields[key]);
  }

  return { assignments, values };
}
```

Used like this:

```ts
const COLUMN_MAP: ColumnMap<UpdateProductPatch> = {
  name: "name",
  slug: "slug",
  categoryId: '"categoryId"',   // quoted: Postgres folds unquoted to lowercase
  status: "status",
  metadata: "metadata",
};
const VALUE_ENCODERS: ValueEncoders<UpdateProductPatch> = {
  metadata: (value) => JSON.stringify(value),
};

async update(id: string, patch: UpdateProductPatch, tx: MaybeTransaction = null) {
  const { assignments, values } = buildUpdateAssignments(patch, COLUMN_MAP, {
    encoders: VALUE_ENCODERS,
  });
  if (assignments.length === 0) return this.findRawById(id, tx);

  const executor = tx ?? this.db;
  const result = await executor.query<ProductRow>(
    `UPDATE products
        SET ${assignments.join(", ")}, "updatedAt" = NOW()
      WHERE id = $1
      RETURNING *`,
    [id, ...values],
  );
  return firstOrNull(result);
}
```

The allow-list lives in exactly one place, so a client sending
`{ "isAdmin": true }` in a product PATCH cannot reach the SQL at all.

---

## 5. Contracts: the file that makes modules replaceable

Every module has one `contracts.ts`. This is its **public API within the
monolith**, and it is the file that makes the difference between a modular
monolith and a big ball of mud.

It holds:

1. **Repository ports** — the interfaces the module's own services depend on.
2. **Command and query shapes** — the input types service methods accept.
3. **Published service ports** — the small interfaces *other* modules may use.

```ts
// modules/inventory/contracts.ts

/* 1. Repository ports, inward-facing */
export interface IInventoryRepository {
  findByProductId(productId: string, tx?: MaybeTransaction): Promise<InventoryRow | null>;
  createInventory(input: CreateInventoryInput, tx?: MaybeTransaction): Promise<InventoryRow>;
  /**
   * Every mutating method returns `InventoryRow | null`, where `null` means
   * "the guard in the WHERE clause did not hold" - a stale version, or a
   * counter that would have gone negative. Callers re-read and retry.
   */
  updateStock(id: string, input: OptimisticUpdateInput, tx?: MaybeTransaction): Promise<InventoryRow | null>;
}

/* 2. Commands */
export interface OrderLineItem {
  productId: string;
  quantity: number;
}
export interface ReserveStockCommand {
  orderId: string;
  items: OrderLineItem[];
}

/* 3. What OTHER modules are allowed to call.
      Deliberately tiny: Ordering gets stock reservation and nothing else. */
export interface IStockReserver {
  reserveStock(command: ReserveStockCommand, tx?: MaybeTransaction): Promise<ReserveStockResult>;
  releaseReservation(orderId: string, tx?: MaybeTransaction): Promise<void>;
}
```

Then `InventoryService implements IStockReserver` (plus a lot of methods that
only its own HTTP endpoints use), and `PlaceOrderService` depends on
`IStockReserver` — three methods, not thirty.

**This is the Interface Segregation Principle, and it is the mechanism that keeps
a monolith honest.** With a narrow published port:

- Reading `IStockReserver` tells you the entire Ordering-to-Inventory
  relationship.
- Faking Inventory in an Ordering test is a five-line object.
- Extracting Inventory into its own service later means reimplementing three
  methods over HTTP, and *nothing in Ordering changes*.

If instead Ordering imported `InventoryService` directly, all three of those
properties are gone, and you will not notice until the day you need them.

---

## 6. How modules talk to each other (the important chapter)

This is where an event-driven design and a direct-call design genuinely differ,
so read this section twice.

### 6.1 The pattern in four steps

Ordering needs Inventory to reserve stock.

**Step 1 — the *provider* module publishes a narrow port** in its `contracts.ts`
(`IStockReserver`, above).

**Step 2 — the provider's service implements it:**

```ts
// modules/inventory/services/InventoryService.ts
export class InventoryService implements IStockReserver {
  async reserveStock(
    command: ReserveStockCommand,
    tx: MaybeTransaction = null,
  ): Promise<ReserveStockResult> {
    // Join the caller's transaction if there is one; open our own if not.
    return this.withTransaction(tx, async (trx) => {
      /* ... reserve, write stock movements ... */
    });
  }
}
```

**Step 3 — the *consumer* depends on the interface only:**

```ts
// modules/ordering/services/PlaceOrderService.ts
import type { IStockReserver } from "../../inventory/contracts";

export interface PlaceOrderServiceDependencies {
  orderRepository: IOrderRepository;
  stockReserver: IStockReserver;       // the port, not the class
  productCatalog: IProductCatalog;     // catalog's published port
  transactionManager: ITransactionManager;
}
```

**Step 4 — the composition root supplies the real object, once:**

```ts
// bootstrap/registerDependencies.ts
const inventoryService = new InventoryService({ /* ... */ });

const placeOrderService = new PlaceOrderService({
  orderRepository,
  stockReserver: inventoryService,   // the only place these two modules meet
  productCatalog: productService,
  transactionManager,
});
```

Every cross-module relationship in the app is now visible in one file. That is
the direct-call equivalent of "look at the queue bindings to see the topology".

### 6.2 The withTransaction helper every shared service needs

A service method that other modules call gets invoked in two situations: from its
own HTTP endpoint (no transaction open yet) and from another module's use case
(transaction already open). Handle both with one small helper:

```ts
private async withTransaction<T>(
  tx: MaybeTransaction,
  run: (tx: Transaction) => Promise<T>,
): Promise<T> {
  if (tx) return run(tx);                        // join the caller's unit of work
  return this.transactionManager.execute(run);   // or start our own
}
```

Without it you get either nested-transaction bugs or a duplicated method per call
style. Make it the standard shape for any service with a published port.

### 6.3 Where do multi-module workflows live?

Put the orchestration in the module that **owns the outcome**, at the top of the
dependency stack. "Place an order" produces an order, so it lives in Ordering:

```
PlaceOrderService (ordering, level 3)
  ├── productCatalog.getPricing(...)        -> catalog   (level 1)
  ├── stockReserver.reserveStock(..., tx)   -> inventory (level 2)
  ├── orderRepository.create(..., tx)       -> its own tables
  └── jobs.enqueue("order.confirmation.email", ...)  -> notification, later
```

Only downward arrows. If a use case seems to need upward ones, the outcome is
owned by the wrong module, or you have found a genuine case for section 6.4.

A useful naming convention as the app grows: when a service accumulates more than
about six public methods, or starts coordinating three modules, split one use
case into its own class — `PlaceOrderService`, `CancelOrderService`,
`RefundOrderService` — each with a single public method. Dependencies stay
minimal and tests stay small.

### 6.4 When B genuinely needs to notify A (the inversion trick)

Inventory (level 2) drops to zero and someone must be emailed. Notification is
level 0, so calling it is *downward* and perfectly legal. Fine.

But the real problem case is this: **Catalog (level 1) creates a product, and
Inventory (level 2) must create a matching stock row.** Catalog may not call
upward. Three legal answers, in order of preference.

**(a) Move the orchestration up.** Introduce a small use case in the higher
module and point the route at that instead:

```ts
// modules/inventory/services/ProductOnboardingService.ts  (level 2, may call catalog)
export class ProductOnboardingService {
  async onboard(command: CreateProductCommand) {
    return this.transactionManager.execute(async (tx) => {
      const product = await this.productCatalog.createProduct(command, tx);
      await this.inventoryService.createInventory({ productId: product.id }, tx);
      return product;
    });
  }
}
```

`POST /products` now hits `ProductOnboardingService`. Catalog stayed ignorant of
Inventory; the arrows still point one way. **This is the right answer nine times
out of ten.**

**(b) Invert the dependency with a hook port.** When several modules must react
and you would rather not thread them all through a use case, let the *lower*
module declare the port and the higher modules implement it:

```ts
// modules/catalog/contracts.ts  - declared by catalog, implemented by others
export interface IProductLifecycleListener {
  onProductCreated(product: ProductRow, tx: Transaction): Promise<void>;
}
```

```ts
// ProductService takes a list of listeners and knows nothing about who they are.
constructor({ productRepository, listeners, transactionManager }: Deps) {
  this.listeners = listeners;
}

const created = await this.transactionManager.execute(async (tx) => {
  const product = await this.productRepository.create(input, tx);
  for (const listener of this.listeners) {
    await listener.onProductCreated(product, tx);   // same transaction
  }
  return product;
});
```

```ts
// bootstrap/registerDependencies.ts
const productService = new ProductService({
  productRepository,
  listeners: [inventoryProductListener],   // wired here, nowhere else
  transactionManager,
});
```

This is the in-process Observer pattern: the same shape as events, minus the
broker, the serialisation, and the eventual consistency. Catalog still does not
import Inventory. Use it when you have three or more reactions, or when reactions
are genuinely optional per deployment. Be aware of the trade-off: a throwing
listener fails the whole request, and the call is now invisible at the call
site — which is exactly the debugging cost that events have too.

**(c) Merge the modules.** If two modules need to call each other constantly and
neither owns the outcome, they were one module all along. Accept it and merge;
that is a better outcome than a cycle you pretend is not there.

### 6.5 The line to never cross

```ts
// NEVER - a concrete class from another module
import { InventoryService } from "../../inventory/services/InventoryService";

// NEVER - another module's repository. Its invariants live in its service;
//         reaching past that means its rules are now optional.
import { InventoryRepository } from "../../inventory/repositories/InventoryRepository";

// NEVER - another module's tables from your own SQL
await this.db.query(`UPDATE inventory SET "availableQuantity" = ...`);

// ALWAYS
import type { IStockReserver } from "../../inventory/contracts";
```

One enforcement step worth taking on day one, so the rule survives contact with a
deadline — an ESLint boundary rule:

```jsonc
// .eslintrc.json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        {
          "group": ["**/modules/*/services/*", "**/modules/*/repositories/*"],
          "message": "Import the module's contracts.ts port instead of its classes."
        }
      ]
    }]
  }
}
```

Relative imports *within* a module still work; a reach into another module's
internals now fails CI. That single rule is worth more than any amount of
documentation, this document included.

---

## 7. Transactions: one unit of work per use case

Without events, a use case that spans modules is one Postgres transaction. This
is the big win of the monolith. Take full advantage of it, deliberately.

### The manager

```ts
// infrastructure/postgres/PostgresTransactionManager.ts
export class PostgresTransactionManager implements ITransactionManager {
  constructor(private readonly postgresClient: PostgresClient) {}

  async execute<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    const client = await this.postgresClient.getClient();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();   // always: a leaked connection eventually kills the pool
    }
  }
}
```

Services depend on the `ITransactionManager` interface, never on this class, so a
test can hand in a fake that just runs the callback.

### The four rules of transactions

**1. The use case opens it, and nobody else.** Not the controller, not the
repository. One `execute()` call per HTTP request, in the service method the
controller calls.

**2. Thread `tx` through everything inside it.** A repository call that forgets
`tx` runs on a *different* connection, outside the transaction. It will not see
the uncommitted rows and will not roll back with them. This is the single most
common bug in this style of code, and it is silent. When you review a transaction
block, check that every call inside it ends with `tx`.

**3. Keep it short. Never `await` a network call inside one.**

```ts
// WRONG: holds a Postgres connection open for an SMTP round trip
await this.transactionManager.execute(async (tx) => {
  const order = await this.orderRepository.create(input, tx);
  await this.emailService.send(order);   // 2 seconds, and can fail
});

// RIGHT: commit first, then do the slow thing (section 8 makes this reliable)
const order = await this.transactionManager.execute((tx) =>
  this.orderRepository.create(input, tx),
);
await this.jobs.enqueue("order.confirmation.email", { orderId: order.id });
```

Under load, the first version exhausts the connection pool and takes the whole
API down. The second cannot.

**4. Do the read-only validation *before* `BEGIN`** where it does not need to be
atomic: uniqueness probes, existence checks, slug generation. Shorter
transaction, less lock contention.

---

## 8. Background work without a message broker

Some work must not happen during the request: sending email, generating a PDF,
calling a payment provider. In the event-driven version RabbitMQ handles this for
free. Here you build a small, boring replacement, and it is genuinely about 150
lines.

### The wrong way first

```ts
// WRONG: fire-and-forget. Unhandled rejection, invisible failures, no retry.
void this.emailService.sendOrderConfirmation(order);
```

If that throws, nobody finds out. If the process restarts one second later, the
email is gone forever with no record it was ever attempted.

### The jobs table

The insight: **you already have a transactional store.** Write the intent to do
the work in the same transaction as the business change, then have a poller pick
it up.

```sql
-- database/migrations/00X_jobs.sql
CREATE TABLE jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,               -- 'order.confirmation.email'
  payload      JSONB       NOT NULL DEFAULT '{}',
  status       TEXT        NOT NULL DEFAULT 'PENDING',
  attempts     INT         NOT NULL DEFAULT 0,
  max_attempts INT         NOT NULL DEFAULT 5,
  run_after    TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- for backoff
  last_error   TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_jobs_status
    CHECK (status IN ('PENDING', 'RUNNING', 'DONE', 'FAILED'))
);

-- Supports the claim query below.
CREATE INDEX idx_jobs_claimable ON jobs (run_after) WHERE status = 'PENDING';
```

Enqueue inside the transaction:

```ts
await this.transactionManager.execute(async (tx) => {
  const order = await this.orderRepository.create(input, tx);
  await this.jobRepository.enqueue(
    { name: "order.confirmation.email", payload: { orderId: order.id } },
    tx,   // same transaction: no order without its email job, and vice versa
  );
  return order;
});
```

That is the outbox pattern with Postgres as both the store *and* the broker. You
get the same atomicity guarantee, without RabbitMQ.

### Claiming a job safely

The one non-obvious query. `FOR UPDATE SKIP LOCKED` lets several workers (or
several instances of your app) claim different rows concurrently without ever
handing the same job to two of them:

```ts
// infrastructure/jobs/JobRepository.ts
async claimBatch(limit: number, tx: Transaction): Promise<JobRow[]> {
  const result = await tx.query<JobRow>(
    `
      UPDATE jobs
         SET status = 'RUNNING', attempts = attempts + 1, "updatedAt" = NOW()
       WHERE id IN (
         SELECT id FROM jobs
          WHERE status = 'PENDING' AND run_after <= NOW()
          ORDER BY run_after
          LIMIT $1
          FOR UPDATE SKIP LOCKED      -- the important bit
       )
      RETURNING *
    `,
    [limit],
  );
  return result.rows;
}
```

### The runner

```ts
// infrastructure/jobs/JobRunner.ts
type JobHandler = (payload: unknown) => Promise<void>;

export class JobRunner {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly deps: {
      jobRepository: IJobRepository;
      transactionManager: ITransactionManager;
      handlers: Record<string, JobHandler>;   // name -> what to do
      intervalMs?: number;
    },
  ) {}

  start(): void {
    const interval = this.deps.intervalMs ?? 2000;
    this.timer = setInterval(() => void this.tick(), interval);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    while (this.running) await new Promise((r) => setTimeout(r, 50)); // drain
  }

  private async tick(): Promise<void> {
    if (this.running) return;   // never overlap ticks
    this.running = true;
    try {
      const jobs = await this.deps.transactionManager.execute((tx) =>
        this.deps.jobRepository.claimBatch(10, tx),
      );
      for (const job of jobs) await this.runOne(job);
    } catch (error) {
      logger.error("Job tick failed", { error: String(error) });
    } finally {
      this.running = false;
    }
  }

  private async runOne(job: JobRow): Promise<void> {
    const handler = this.deps.handlers[job.name];
    if (!handler) {
      await this.deps.jobRepository.markFailed(job.id, `No handler for '${job.name}'`);
      return;
    }
    try {
      await handler(job.payload);
      await this.deps.jobRepository.markDone(job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (job.attempts >= job.max_attempts) {
        await this.deps.jobRepository.markFailed(job.id, message);
        logger.error("Job permanently failed", { jobId: job.id, name: job.name, message });
      } else {
        // exponential backoff: 2s, 4s, 8s, 16s...
        const delaySeconds = 2 ** job.attempts;
        await this.deps.jobRepository.retryLater(job.id, delaySeconds, message);
      }
    }
  }
}
```

Handlers are registered in the composition root, which is also where the
notification module gets connected without anybody importing it:

```ts
const jobRunner = new JobRunner({
  jobRepository,
  transactionManager,
  handlers: {
    "order.confirmation.email": (payload) =>
      notificationService.sendOrderConfirmation(payload as { orderId: string }),
    "user.welcome.email": (payload) =>
      notificationService.sendWelcomeEmail(payload as { userId: string }),
  },
});
```

**Write handlers to be idempotent.** A crash between "job done" and "commit"
means a job can run twice. Sending one duplicate email is survivable; charging a
card twice is not. For those, check state first
(`if (payment.status === 'CAPTURED') return;`).

### Scheduled work

Same table, one extra column, or simply a second timer for periodic tasks
(expiring stale reservations, cleaning up old sessions). Keep the schedule in one
file so "what runs on a timer?" has a single answer:

```ts
// bootstrap/registerJobs.ts
export function registerJobs(deps: AppContainer): JobRunner {
  const runner = new JobRunner({ /* ... */ });
  runner.start();

  setInterval(() => void deps.reservationService.expireStale(), 60_000);
  setInterval(() => void deps.sessionService.cleanupExpired(), 3_600_000);

  return runner;
}
```

And shut them down cleanly, or a deploy will kill jobs mid-flight:

```ts
// bootstrap/registerGracefulShutdown.ts
process.on("SIGTERM", async () => {
  server.close();                 // stop accepting new requests
  await jobRunner.stop();         // let in-flight jobs finish
  await postgresClient.close();
  process.exit(0);
});
```

### One caveat before you scale

A `setInterval` runner inside the API process is right for one or two instances,
and `FOR UPDATE SKIP LOCKED` keeps it correct even with several. Beyond that, or
once jobs get heavy enough to compete with request handling for CPU, run the same
`JobRunner` in a **separate process** (`node dist/worker.js`, same composition
root, no HTTP server). The code does not change; only the entry point does. That
is the payoff of keeping wiring in one file.

---

## 9. Concurrency: two people, one last item in stock

Two requests read `availableQuantity = 1` at the same time, both decide "yes,
that is enough", and both write `0`. You have sold two of one item. This bug
exists in every ecommerce backend that has not explicitly handled it, and it does
not show up in manual testing.

Two solutions. Know both, and when to use which.

### Optimistic locking, for rows that are usually not contended

Add a `version` column. Update only if the version is still what you read:

```sql
ALTER TABLE inventory ADD COLUMN version INT NOT NULL DEFAULT 0;
```

```ts
// The WHERE clause is the lock. `null` back means someone else won.
async updateStock(
  id: string,
  input: OptimisticUpdateInput,
  tx: MaybeTransaction = null,
): Promise<InventoryRow | null> {
  const executor = tx ?? this.db;
  const result = await executor.query<InventoryRow>(
    `
      UPDATE inventory
         SET "availableQuantity" = $1,
             "reservedQuantity"  = $2,
             version             = version + 1,
             "updatedAt"         = NOW()
       WHERE id = $3
         AND version = $4                      -- nobody changed it since we read
         AND $1 >= 0 AND $2 >= 0               -- and no counter goes negative
      RETURNING *
    `,
    [input.availableQuantity, input.reservedQuantity, id, input.expectedVersion],
  );
  return firstOrNull(result);
}
```

The service retries a bounded number of times:

```ts
// A losing writer re-reads and retries. Under READ COMMITTED every retry's
// SELECT sees the latest committed version, so a few attempts converge even
// under heavy contention on one hot product row.
const MAX_OPTIMISTIC_RETRIES = 5;

for (let attempt = 0; attempt < MAX_OPTIMISTIC_RETRIES; attempt += 1) {
  const inventory = await this.inventoryRepository.findByProductId(productId, tx);
  if (!inventory) throw new NotFoundError("Inventory not found");

  if (inventory.availableQuantity < quantity) {
    throw new ConflictError("Insufficient stock");   // a real business failure
  }

  const updated = await this.inventoryRepository.updateStock(inventory.id, {
    availableQuantity: inventory.availableQuantity - quantity,
    reservedQuantity:  inventory.reservedQuantity + quantity,
    expectedVersion:   inventory.version,
  }, tx);

  if (updated) return updated;   // we won
  // else: someone else committed first, so loop and re-read
}
throw new ConflictError("Stock is being updated concurrently, please retry");
```

Note the two different failure modes, and that they are *not* the same thing:
"not enough stock" is a business rule (`ConflictError`, do not retry); "version
moved" is contention (retry silently).

### Pessimistic locking, for rows that are always contended

`SELECT ... FOR UPDATE` makes the second transaction wait instead of failing:

```ts
const result = await tx.query<InventoryRow>(
  `SELECT * FROM inventory WHERE "productId" = $1 FOR UPDATE`,
  [productId],
);
```

Simpler, no retry loop, but it serialises access and can deadlock if two
transactions lock the same rows in different orders. **If you take multiple
locks, always take them in a consistent order** (for example, sort line items by
`productId` before looping). That one habit prevents most deadlocks.

**Choosing:** optimistic for inventory and general entity updates, where
contention is rare and retries are cheap. Pessimistic for a flash sale on one
SKU, or wherever you would otherwise exhaust the retry budget.

Either way, add the database-level backstop so a bug in the code cannot corrupt
data:

```sql
ALTER TABLE inventory
  ADD CONSTRAINT chk_inventory_non_negative
  CHECK ("availableQuantity" >= 0 AND "reservedQuantity" >= 0);
```

Application checks are for good error messages. Constraints are for correctness.
Write both.

---

## 10. Errors: one way to fail

### A class per HTTP status

```ts
// shared/errors/AppError.ts
export class AppError extends Error {
  readonly statusCode: number;
  readonly errors?: ValidationIssue[];   // field-level detail for validation

  constructor(message: string, statusCode = 500, errors?: ValidationIssue[]) {
    super(message);
    this.statusCode = statusCode;
    if (errors !== undefined) this.errors = errors;
    this.name = new.target.name;
    Error.captureStackTrace(this, new.target);
  }
}
```

```ts
export class BadRequestError   extends AppError { constructor(m = "Bad request", e?: ValidationIssue[]) { super(m, 400, e); } }
export class UnauthorizedError extends AppError { constructor(m = "Unauthorized") { super(m, 401); } }
export class ForbiddenError    extends AppError { constructor(m = "Forbidden")    { super(m, 403); } }
export class NotFoundError     extends AppError { constructor(m = "Not found")    { super(m, 404); } }
export class ConflictError     extends AppError { constructor(m = "Conflict")     { super(m, 409); } }
export class InternalServerError extends AppError { constructor(m = "Internal server error") { super(m, 500); } }
```

Now a service expresses failure in business language and never thinks about HTTP:

```ts
throw new ConflictError(`SKU '${data.sku}' already exists`);   // becomes 409
throw new NotFoundError("Product not found");                   // becomes 404
```

### One handler, at the very end

```ts
// app/registerErrorHandlers.ts
export function registerErrorHandlers(app: Express): void {
  const handler: ErrorRequestHandler = (error, _req, res, _next) => {
    // An AppError is something WE decided to raise: safe to show the client.
    if (error instanceof AppError) {
      const response: ErrorResponse = { success: false, message: error.message };
      if (error.errors) response.errors = error.errors;
      res.status(error.statusCode).json(response);
      return;
    }

    // Anything else is an unexpected fault: log it all, reveal nothing.
    logger.error("Unhandled error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({ success: false, message: "Internal server error" });
  };

  app.use(handler);   // registered LAST, after all routes
}
```

The `instanceof AppError` split is the whole design: deliberate errors are
described to the caller, and a leaked Postgres error message — which may contain
a table name, a column, or a value — never reaches them.

**In controllers: `catch (error) { next(error); }` and nothing else.** Formatting
an error response inside a controller means two places define your error format,
and they will diverge.

---

## 11. Validation at the edge

Validation is layered, and each layer has a distinct job. Junior developers often
try to do all of it in one place; that is what makes it feel tedious.

| Layer | Question it answers | Example | Failure |
|---|---|---|---|
| Zod validator | Is this well-formed? | `quantity` is an integer >= 1 | 400 |
| Middleware | Are you allowed? | `product:create` permission | 401 / 403 |
| Service | Does this make sense *now*? | Product is not archived; stock suffices | 409 / 404 |
| Database | Is the data structurally valid? | `CHECK (quantity >= 0)`, FK, UNIQUE | 500 (a bug) |

The key insight: **Zod cannot know whether a product is archived, and the service
should not re-check that `quantity` is a number.** Type-shape questions go in the
schema; state questions go in the service; invariants that must hold regardless
of code go in the schema of the *database*.

A related habit worth adopting: keep the `CHECK` constraints and the TypeScript
constants in sync, and say so in a comment.

```ts
// modules/catalog/constants/ProductStatus.ts
//
// Mirrors chk_products_status in migration 005.
```

Cheap, and it means the next person who adds a status knows there are two places
to change.

---

## 12. Wiring it all up: the composition root

Exactly one file constructs objects with `new`. Everywhere else receives what it
needs through its constructor. This is dependency injection: no framework, no
decorators, no container library.

### The container is just a typed object

```ts
// bootstrap/container.ts
/**
 * The composed application graph. Everything is wired once in
 * `registerDependencies()` and passed down from there - no module reaches
 * for a global.
 */
export interface AppContainer {
  /* Controllers */
  authController: AuthController;
  productController: ProductController;
  orderController: OrderController;

  /* Middleware */
  jwtMiddleware: JwtMiddleware;
  permissionMiddleware: PermissionMiddleware;

  /* Services (needed by jobs, scripts or tests) */
  productService: ProductService;
  inventoryService: InventoryService;
  placeOrderService: PlaceOrderService;
  notificationService: INotificationService;

  /* Background */
  jobRunner: JobRunner;
}
```

Consumers take a `Pick<>` of exactly what they use, which is what
`ProductRouteDependencies` in section 4.1 is.

### Constructed in dependency order

```ts
// bootstrap/registerDependencies.ts
export function registerDependencies(): AppContainer {
  /* --- Infrastructure --- */
  const db = PostgresClient.getInstance();
  const transactionManager = new PostgresTransactionManager(db);

  /* --- Repositories: all they need is a query executor --- */
  const userRepository      = new UserRepository(db);
  const productRepository   = new ProductRepository(db);
  const inventoryRepository = new InventoryRepository(db);
  const orderRepository     = new OrderRepository(db);
  const jobRepository       = new JobRepository(db);

  /* --- Services: bottom of the module stack upward --- */
  const notificationService = new NotificationService({
    emailProvider: new ConsoleEmailProvider(),
  });

  const productService = new ProductService({
    productRepository, categoryRepository, brandRepository, transactionManager,
  });

  const inventoryService = new InventoryService({
    inventoryRepository, reservationRepository, stockMovementRepository, transactionManager,
  });

  // The single place Ordering and Inventory meet.
  const placeOrderService = new PlaceOrderService({
    orderRepository,
    stockReserver: inventoryService,   // satisfies IStockReserver
    productCatalog: productService,    // satisfies IProductCatalog
    jobRepository,
    transactionManager,
  });

  /* --- Delivery layer on top --- */
  const productController = new ProductController(productService);
  const orderController   = new OrderController(placeOrderService);

  const jwtMiddleware = new JwtMiddleware({
    tokenService, userRepository, tokenBlacklistService,
  });

  /* --- Background --- */
  const jobRunner = new JobRunner({
    jobRepository,
    transactionManager,
    handlers: {
      "order.confirmation.email": (p) =>
        notificationService.sendOrderConfirmation(p as never),
    },
  });

  return { productController, orderController, jwtMiddleware, productService,
           inventoryService, placeOrderService, notificationService, jobRunner };
}
```

### Why this beats importing a singleton everywhere

Nothing calls `getInstance()` except infrastructure clients. That gives you:

- **Testability.** `createApp(fakeContainer)` gives you the real HTTP stack over
  fake services. No mocking library, no module-registry hacks.
- **A visible architecture.** One file answers "what depends on what?" Reading
  `registerDependencies.ts` is how a new team member learns the system in ten
  minutes.
- **Startup-time failure.** A missing dependency is a TypeScript error, not a 3am
  `undefined is not a function`.

### The entry point stays tiny

```ts
// src/server.ts
async function bootstrap(): Promise<void> {
  const db = PostgresClient.getInstance();
  await db.connect();                        // fail fast if the DB is unreachable

  const dependencies = registerDependencies();
  const app = createApp(dependencies);

  registerJobs(dependencies);

  const server = http.createServer(app);
  server.listen(PORT, () => logger.info(`Listening on ${PORT}`));

  registerGracefulShutdown({ server, dependencies, db });
}

void bootstrap();
```

```ts
// app/createApp.ts - takes the container as an argument, never imports it
export function createApp(dependencies: AppContainer): Express {
  const app = express();
  registerMiddleware(app);      // request-id, cors, access log, json
  registerRoutes(app, dependencies);
  registerErrorHandlers(app);   // always last
  return app;
}
```

---

## 13. Database and migration conventions

Pick these on day one; changing them later is a chore.

**Plain SQL migrations, numbered, forward-only.**

```
database/migrations/
├── 001_identity.sql
├── 002_jobs.sql
├── 003_catalog.sql
└── 004_inventory.sql
```

A roughly 40-line runner is enough: create a `migrations` table, list the files,
run each unapplied one inside a transaction, record it. Resist an ORM's migration
DSL early on. Plain SQL is what you will paste into psql to debug production
anyway, and it never disagrees with the database.

**Conventions worth being rigid about:**

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` — no leaking row counts, and
  IDs can be generated client-side when needed.
- `"createdAt"` and `"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()` on every
  table. Always `TIMESTAMPTZ`, never `TIMESTAMP`.
- Money as `NUMERIC(12, 2)` or integer minor units. **Never** `FLOAT`.
- Pick one identifier case and never mix. This repo uses quoted camelCase
  (`"productId"`) so column names match the TypeScript fields exactly;
  snake_case is equally fine. Mixing the two is not.
- Encode invariants as constraints: `CHECK`, `UNIQUE`, `NOT NULL`, and foreign
  keys with a deliberate `ON DELETE`. Every constraint is a class of bug that
  becomes impossible.
- Index every foreign key you filter or join on, plus every column in a `WHERE`
  or `ORDER BY` of a list endpoint. Use partial indexes for status filters:
  `CREATE INDEX ... ON jobs (run_after) WHERE status = 'PENDING'`.

**Prefer soft state transitions to `DELETE`.** `status = 'ARCHIVED'` keeps
history, keeps foreign keys valid, and makes "why did this vanish?" answerable.

---

## 14. Testing strategy

The layering exists so that tests are easy. Cash in.

### Unit-test services with fake repositories

A repository port is an interface, so a fake is an object literal. No mocking
framework needed:

```ts
const productRepository: IProductRepository = {
  exists: async () => false,
  create: async (input) => ({ id: "p1", ...input } as ProductRow),
  findRawById: async () => null,
  findById: async () => ({ id: "p1", images: [] } as ProductAggregateRow),
  // ...the rest
};

const transactionManager: ITransactionManager = {
  execute: (callback) => callback({} as Transaction),   // no real transaction
};

const service = new ProductService({ productRepository, /* ... */ transactionManager });

await expect(service.createProduct(command)).resolves.toMatchObject({ id: "p1" });
```

This is where **business rules** get tested: transitions, guards, conflict
errors, the concurrency retry loop. Fast, no database, no flakiness.

### Integration-test repositories against a real Postgres

SQL is the one thing a fake cannot verify. Run these against a real database
(Docker or a test schema), wrapping each test in a transaction you roll back.
Test the queries that have logic in them: dynamic WHERE building, pagination, the
optimistic UPDATE returning `null` on a stale version, `claimBatch`.

### End-to-end-test the HTTP layer with a fake container

Because `createApp` takes the container as an argument:

```ts
const app = createApp({ ...realContainer, productService: fakeProductService });
await request(app).post("/api/v1/products").send(body).expect(201);
```

Real routing, real middleware order, real validation, real error handler, no
database. These tests catch the mistakes unit tests structurally cannot: a
missing `validate()`, middleware in the wrong order, a 404 that should be a 409.

### What to test first if you only have an afternoon

1. The service methods with a state machine or a retry loop.
2. Every repository method with a dynamically built query.
3. One end-to-end happy path plus one 4xx per endpoint group.

---

## 15. A full worked example: place an order

Everything above, in one flow. This is the case the event-driven version splits
across `order.created`, an outbox row, a queue, and `OrderCreatedConsumer`.

### The route

```ts
// modules/ordering/routes/order.routes.ts
router.post(
  "/",
  jwtMiddleware.authenticate.bind(jwtMiddleware),
  validate(PlaceOrderValidator),
  orderController.place.bind(orderController),
);
```

### The validator

```ts
// modules/ordering/validators/PlaceOrderValidator.ts
export const PlaceOrderValidator = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.uuid(),
          quantity: z.number().int().min(1).max(100),
        }),
      )
      .min(1, "An order needs at least one item"),
    shippingAddressId: z.uuid(),
  }),
});
export type PlaceOrderInput = z.infer<typeof PlaceOrderValidator>;
```

### The controller

```ts
// modules/ordering/controllers/OrderController.ts
async place(req: Request, res: Response, next: NextFunction) {
  try {
    const { body } = validated<PlaceOrderInput>(req);

    const order = await this.placeOrderService.place({
      userId: req.user.id,               // set by jwtMiddleware
      items: body.items,
      shippingAddressId: body.shippingAddressId,
    });

    return res.status(201).json(OrderResponseDto.fromEntity(order));
  } catch (error) {
    next(error);
  }
}
```

### The use case, the heart of it

```ts
// modules/ordering/services/PlaceOrderService.ts

import type { IProductCatalog } from "../../catalog/contracts";
import type { IStockReserver } from "../../inventory/contracts";

export interface PlaceOrderServiceDependencies {
  orderRepository: IOrderRepository;
  productCatalog: IProductCatalog;      // level 1
  stockReserver: IStockReserver;        // level 2
  jobRepository: IJobRepository;
  transactionManager: ITransactionManager;
}

export class PlaceOrderService {
  constructor(private readonly deps: PlaceOrderServiceDependencies) {}

  async place(command: PlaceOrderCommand): Promise<OrderAggregateRow> {
    /* ---------- 1. Validate and price, OUTSIDE the transaction ---------- */

    const productIds = command.items.map((item) => item.productId);
    const products = await this.deps.productCatalog.findPurchasableByIds(productIds);

    if (products.length !== productIds.length) {
      throw new BadRequestError("One or more products are unavailable");
    }

    const priceByProduct = new Map(products.map((p) => [p.id, p.price]));

    const lines = command.items.map((item) => {
      const unitPrice = priceByProduct.get(item.productId);
      if (unitPrice === undefined) {
        throw new InternalServerError(`Missing price for product ${item.productId}`);
      }
      return { ...item, unitPrice, lineTotal: unitPrice * item.quantity };
    });

    const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);

    /* ---------- 2. One transaction for every write ---------- */

    const order = await this.deps.transactionManager.execute(async (tx) => {
      const created = await this.deps.orderRepository.create(
        {
          userId: command.userId,
          shippingAddressId: command.shippingAddressId,
          status: OrderStatus.PENDING_PAYMENT,
          total,
        },
        tx,
      );

      await this.deps.orderRepository.addLines(created.id, lines, tx);

      // THIS is the direct call that replaces the `order.created` event.
      // Sorted by productId so concurrent orders lock rows in the same
      // order and cannot deadlock each other.
      const reservation = await this.deps.stockReserver.reserveStock(
        {
          orderId: created.id,
          items: [...command.items].sort((a, b) =>
            a.productId.localeCompare(b.productId),
          ),
        },
        tx,   // same transaction: no order survives a failed reservation
      );

      if (!reservation.success) {
        // Throwing rolls back the order AND the lines. Nothing partial persists.
        throw new ConflictError(
          `Insufficient stock for: ${reservation.shortages
            .map((s) => s.productId)
            .join(", ")}`,
        );
      }

      // Slow, external work is queued, not awaited (section 8).
      await this.deps.jobRepository.enqueue(
        { name: "order.confirmation.email", payload: { orderId: created.id } },
        tx,
      );

      return created;
    });

    /* ---------- 3. Read back the aggregate for the response ---------- */

    return this.requireAggregate(order.id);
  }
}
```

### Read it once more, and notice what it gives you

- **Atomic.** Order, lines, reservation and the queued email either all exist or
  none do. In the event-driven version the order commits and the reservation
  happens later, which means a whole class of "order exists but stock was never
  reserved" states you must design for.
- **Honest errors.** Out of stock is a `409` on *this* request, with the
  offending product IDs. Eventually consistent designs must instead cancel the
  order afterwards and tell the customer by email.
- **Debuggable.** One stack trace covers the whole flow.
- **Still modular.** Ordering imported two interfaces and zero classes. Extract
  Inventory into a separate service tomorrow and only
  `registerDependencies.ts` changes — though then you also inherit the
  distributed-transaction problem that events exist to solve. Which is the honest
  summary of this whole trade-off.

---

## 16. The add-a-feature checklist

Adding `POST /products/:id/discount`? Work top-down, in this order. It works for
any endpoint in any module.

1. **Migration** — new columns or tables, with constraints and indexes.
   `database/migrations/00N_*.sql`
2. **Types** — the row shape in `shared/types/entities.ts`.
3. **Repository port** — add the method to the interface in `contracts.ts` first.
   Designing the signature before the SQL keeps the SQL honest.
4. **Repository** — implement it. `executor = tx ?? this.db`, parameterised,
   `firstOrNull` / `firstOrFail`.
5. **Command type** — what the service accepts, in `contracts.ts`.
6. **Service** — the business rules. Guards first, then one transaction, then the
   read-back. If it needs another module, use that module's published port; if
   that module does not have one yet, add the *smallest* interface that works.
7. **Validator** — a Zod schema plus its `z.infer` type export.
8. **DTOs** — `fromRequest` if the input needs mapping, `fromEntity` for output.
   Never return a raw row.
9. **Controller** — read `validated<T>(req)`, call the service, return a DTO,
   `next(error)`.
10. **Route** — authenticate, authorise, validate, handle. Remember `.bind()`.
11. **Wiring** — only if you introduced a class: add it to `container.ts` and
    `registerDependencies.ts`.
12. **Tests** — service unit test for the rules, repository integration test for
    the SQL, one end-to-end happy path.
13. **`npm run typecheck`** — before you run anything. It catches most of it.

If a step feels impossible ("my service needs `req`", "my controller needs a
transaction", "my repository needs to throw `ConflictError`"), that is the design
telling you the logic is in the wrong layer. Move it; do not work around it.

---

## 17. Anti-patterns to refuse in code review

| Anti-pattern | Why it hurts | Do instead |
|---|---|---|
| `import { XService } from "../../other/services/XService"` | Permanent coupling; the module can never be extracted or tested alone | Import the port from `other/contracts` |
| Querying another module's tables | Its invariants become optional; a schema change breaks a module that never mentioned it | Call its service through its port |
| Two modules importing each other | They are one module now, forever | Move orchestration up (6.4a) or merge |
| Repository call inside a transaction without `tx` | Runs on another connection: sees uncommitted data as absent, does not roll back. **Silent.** | Thread `tx` everywhere |
| `await emailService.send()` inside a transaction | Holds a pooled connection across a network call; exhausts the pool under load | Enqueue a job (section 8) |
| `void doSomethingAsync()` | Failures vanish; a restart loses the work | Enqueue a job |
| `res.json(row)` | Leaks columns such as `passwordHash`; every `ALTER TABLE` is a breaking API change | A response DTO |
| Business rules in a controller | Untestable without HTTP; duplicated the moment a job needs the same rule | Move into the service |
| SQL in a service | Cannot fake it in a test; SQL scattered across layers | Move into the repository |
| String-concatenated SQL with user input | SQL injection | `$1` parameters; allow-list maps for identifiers |
| `ORDER BY ${req.query.sortBy}` | SQL injection via a column name | `SORTABLE[key]` map plus a Zod enum |
| Formatting errors in a controller | Two error formats that drift apart | `next(error)` and one handler |
| `getInstance()` inside a service | Hidden dependency, untestable, invisible in the container | Constructor injection |
| One giant `UserService` with 40 methods | Nobody can hold it in their head; every test needs every dependency | Split by use case |
| Skipping DB constraints because "the app checks it" | The app has bugs; the constraint does not | Write both |
| `FLOAT` for money | `0.1 + 0.2 !== 0.3`; real financial drift | `NUMERIC(12,2)` or integer minor units |

---

## 18. What you gave up, and when to add events back

Be honest about the trade-off so you can recognise the day it flips.

**What the direct-call monolith costs you:**

- **Coupling in time.** If reserving stock is slow, placing an order is slow. The
  request only completes when every step does.
- **Coupling in availability.** If the inventory code throws, order placement
  fails. With events, the order succeeds and the reservation retries.
- **Fan-out edits.** A fourth reaction to a placed order means editing
  `PlaceOrderService`. With events it is a new consumer and Ordering never
  changes. (This is the cost people notice first, and it is the mildest.)
- **One deploy, one scale unit.** You cannot scale or release Inventory
  independently of everything else.

**Add events for a specific flow when you can name the pain:**

1. **A slow or unreliable third party is in your critical path.** Payment
   webhooks, shipping-label APIs. Often the jobs table (section 8) is already
   enough. Try that first.
2. **One event genuinely has many independent consumers.** Five reactions to
   "user registered", each owned by a different team, each optional.
3. **A module needs to scale separately.** Search indexing, report generation,
   image processing.
4. **The fan-out edit is actually hurting.** Not "might one day" — you have
   modified the same use case for unrelated reasons three sprints running.

**How to migrate, and this is why the layering was worth it:**

Your business logic never mentioned the transport. So you add an outbox table,
change one call site from a direct call to `outboxService.addEvent(...)` in the
same transaction, and wrap the receiving service method in a consumer. The
service on both ends is untouched. Migrate **one flow at a time** — the outbox
pattern and a direct call coexist fine in the same codebase, and this repo's
[docs.md](docs.md) shows exactly what the destination looks like.

What you must not do is skip the monolith. A team that starts with five queues
before it has five hundred users spends its first six months on infrastructure
and its next six discovering that its module boundaries were wrong anyway — and
boundaries are dramatically cheaper to move when they are function calls.

---

## 19. Day-one starter skeleton

Concretely, hour by hour, what to build first.

### Dependencies

```bash
npm init -y
npm i express pg zod dotenv jsonwebtoken bcrypt pino pino-pretty cors
npm i -D typescript tsx @types/node @types/express @types/pg @types/jsonwebtoken @types/bcrypt
```

No RabbitMQ, no Redis, no BullMQ. Add Redis when you have a measured caching or
rate-limiting need; the jobs table covers background work until you have real
throughput problems.

### tsconfig.json, with the checks that actually catch bugs

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "sourceMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,

    "strict": true,
    "noUncheckedIndexedAccess": true,   // rows[0] is T | undefined, see rows.ts
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true, // exhaustive status switches
    "noImplicitReturns": true,
    "noUnusedLocals": true
  },
  "include": ["src/**/*.ts"]
}
```

`noUncheckedIndexedAccess` is the one people disable and then regret. It is
precisely what forces every repository read to state whether it expects
zero-or-one row or exactly one, the distinction `firstOrNull` / `firstOrFail`
encodes. Keep it on from commit one; retrofitting it later is a bad afternoon.

### package.json scripts

```jsonc
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "migrate": "tsx src/scripts/migrate.ts",
    "seed": "tsx src/scripts/seed.ts",
    "test": "node --test"
  }
}
```

### Build in this order

**Hour 1 — the skeleton that boots.** `config/postgres.ts`,
`infrastructure/postgres/PostgresClient.ts`, `PostgresTransactionManager.ts`,
`shared/types/database.ts`, `Logger.ts`, `server.ts`, `createApp.ts`, and a
`GET /health` that runs `SELECT 1`. Do not move on until `npm run dev` is green.

**Hour 2 — the shared foundation.** `shared/errors/*`,
`registerErrorHandlers.ts`, `shared/validators/validate.ts`,
`shared/utils/rows.ts`, `shared/types/pagination.ts`,
`shared/utils/sqlUpdate.ts`. None of this is a feature, and every feature
afterwards is twice as fast.

**Hour 3 — the migration runner and migration 001.** Get `npm run migrate`
working now, while the schema is one table. Retrofitting a migration runner over
a hand-edited database is genuinely unpleasant.

**Day 1 — one vertical slice, end to end.** Pick the simplest entity you have:
brands, categories, tags. Build all seven layers, wire it in
`registerDependencies.ts`, hit it with curl. Now you have a template, and every
later feature is a variation on files you can read.

**Day 2 — identity.** Users, password hashing (bcrypt, cost 12 or higher), JWT
access and refresh tokens, sessions, `JwtMiddleware`, roles and permissions with
`PermissionMiddleware`. Everything else depends on this, and bolting auth on
later means touching every route file.

**Day 3 — the jobs table and `JobRunner`** (section 8), plus the notification
module as its first handler. Do it before you need it, because the first time you
need it you will be tempted to write `void sendEmail()` instead.

**Then — your actual domain.** Catalog, then inventory (with section 9's
optimistic locking from the start, not retrofitted after the first oversell),
then ordering with the `PlaceOrderService` from section 15.

### The one-page summary, if you remember nothing else

- Layers: **route, validator, controller, DTO, service, repository, SQL**. Each
  layer knows only the next one down.
- **Services hold the rules. Repositories hold the SQL. Controllers hold
  neither.**
- Cross-module calls go through a **narrow interface in `contracts.ts`**, wired
  in **one** composition root.
- Modules form a **one-way stack**. No cycles, ever.
- **One transaction per use case**, opened by the service, `tx` threaded through
  every call inside it.
- **Nothing slow inside a transaction.** Queue it in the jobs table.
- **Validate at the edge, enforce rules in the service, constrain in the
  database.**
- **One error class per status, one error handler, one place responses are
  shaped.**

That is the whole architecture. Everything else in this document is an
elaboration of those eight lines.
