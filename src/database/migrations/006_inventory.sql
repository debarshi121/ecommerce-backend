CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    ---------------------------------------------------
    -- Inventory owns stock for a productId that lives in the Catalog
    -- module's `products` table. There is deliberately NO foreign key here:
    -- Inventory and Catalog are separate bounded contexts that communicate
    -- only through events (ProductCreated). A hard FK would couple their
    -- schemas together and make it impossible to split Inventory into its
    -- own database/service later.
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS inventory
        (
            id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "productId"          UUID NOT NULL UNIQUE,
            "availableQuantity"  INTEGER NOT NULL DEFAULT 0,
            "reservedQuantity"   INTEGER NOT NULL DEFAULT 0,
            version              INTEGER NOT NULL DEFAULT 1,
            "createdAt"          TIMESTAMP DEFAULT NOW(),
            "updatedAt"          TIMESTAMP DEFAULT NOW(),

            CONSTRAINT chk_inventory_available_non_negative CHECK ("availableQuantity" >= 0),
            CONSTRAINT chk_inventory_reserved_non_negative CHECK ("reservedQuantity" >= 0)
        )
    ;
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_inventory_available_quantity
        ON inventory ("availableQuantity");
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS inventory_reservations
        (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "orderId"     UUID NOT NULL,
            "productId"   UUID NOT NULL,
            quantity      INTEGER NOT NULL,
            status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            "expiresAt"   TIMESTAMP,
            "createdAt"   TIMESTAMP DEFAULT NOW(),
            "updatedAt"   TIMESTAMP DEFAULT NOW(),

            CONSTRAINT chk_inventory_reservations_quantity_positive CHECK (quantity > 0),
            CONSTRAINT chk_inventory_reservations_status
                CHECK (status IN ('PENDING', 'RESERVED', 'RELEASED', 'CONFIRMED', 'EXPIRED', 'FAILED'))
        )
    ;
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order_id
        ON inventory_reservations ("orderId");
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_id
        ON inventory_reservations ("productId");
    ---------------------------------------------------
    -- Backs the expiry sweep: WHERE status = 'RESERVED' AND "expiresAt" < NOW()
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status_expires_at
        ON inventory_reservations (status, "expiresAt");
    ---------------------------------------------------
    -- stock_movements is append-only: every inventory change (initial
    -- creation, manual increase/decrease/adjustment, reservation, release,
    -- confirmation) writes exactly one row here. No UPDATE/DELETE path is
    -- exposed by the repository — this table is the durable audit ledger.
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS stock_movements
        (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "productId"     UUID NOT NULL,
            "movementType"  VARCHAR(20) NOT NULL,
            quantity        INTEGER NOT NULL,
            "referenceId"   UUID,
            reason          TEXT,
            "createdAt"     TIMESTAMP DEFAULT NOW(),

            CONSTRAINT chk_stock_movements_quantity_non_negative CHECK (quantity >= 0),
            CONSTRAINT chk_stock_movements_type
                CHECK ("movementType" IN (
                    'INITIAL', 'INCREASE', 'DECREASE', 'ADJUSTMENT',
                    'RESERVATION', 'RELEASE', 'CONFIRMATION'
                ))
        )
    ;
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id_created_at
        ON stock_movements ("productId", "createdAt" DESC);
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_id
        ON stock_movements ("referenceId");
