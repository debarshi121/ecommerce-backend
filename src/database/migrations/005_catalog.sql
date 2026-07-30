CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS categories
        (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "parentId"    UUID REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
            name          VARCHAR(255) NOT NULL,
            slug          VARCHAR(255) NOT NULL UNIQUE,
            description   TEXT,
            "createdAt"   TIMESTAMP DEFAULT NOW(),
            "updatedAt"   TIMESTAMP DEFAULT NOW()
        )
    ;
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_categories_parent_id
        ON categories ("parentId");
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_categories_slug
        ON categories (slug);
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS brands
        (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name          VARCHAR(255) NOT NULL UNIQUE,
            slug          VARCHAR(255) NOT NULL UNIQUE,
            logo          TEXT,
            description   TEXT,
            "createdAt"   TIMESTAMP DEFAULT NOW(),
            "updatedAt"   TIMESTAMP DEFAULT NOW()
        )
    ;
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_brands_slug
        ON brands (slug);
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS products
        (
            id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            sku                  VARCHAR(100) NOT NULL UNIQUE,
            slug                 VARCHAR(255) NOT NULL UNIQUE,
            name                 VARCHAR(255) NOT NULL,
            "shortDescription"   VARCHAR(500),
            description          TEXT,
            "categoryId"         UUID REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
            "brandId"            UUID REFERENCES brands(id) ON DELETE SET NULL ON UPDATE CASCADE,
            status               VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
            metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
            "createdAt"          TIMESTAMP DEFAULT NOW(),
            "updatedAt"          TIMESTAMP DEFAULT NOW(),

            CONSTRAINT chk_products_status
                CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'))
        )
    ;
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_products_category_id
        ON products ("categoryId");
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_products_brand_id
        ON products ("brandId");
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_products_status
        ON products (status);
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_products_status_created_at
        ON products (status, "createdAt" DESC);
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_products_name_trgm
        ON products USING GIN (name gin_trgm_ops);
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_products_sku_trgm
        ON products USING GIN (sku gin_trgm_ops);
    ---------------------------------------------------
    CREATE TABLE IF NOT EXISTS product_images
        (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "productId"   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
            "imageUrl"    TEXT NOT NULL,
            "altText"     VARCHAR(255),
            position      INTEGER NOT NULL DEFAULT 0,
            "createdAt"   TIMESTAMP DEFAULT NOW(),

            CONSTRAINT uq_product_images_product_position UNIQUE ("productId", position)
        )
    ;
    ---------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_product_images_product_id
        ON product_images ("productId");
