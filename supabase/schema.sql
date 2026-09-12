-- ============================================================================
-- NEOSALES — BOTSWANA COMMERCE SCHEMA (Supabase / PostgreSQL 15+)
-- Currency: BWP (Botswana Pula) · Hub: Francistown, North-East District, BW
--
-- The storefront runs fully offline against localStorage. Applying this schema
-- and setting NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY switches
-- the app to live cloud persistence with zero code changes.
--
-- Architecture notes:
--   * Stock is reserved by the application the moment an order is created and
--     pushed to `product_variants.stock_quantity` (see lib/supabaseClient.ts).
--     There is intentionally no payment-triggered stock trigger, which would
--     double-decrement against the client-side reservation. Cancelling an order
--     returns its reserved units to stock the same way (status = 'cancelled').
--   * Row Level Security keeps the catalog publicly readable and allows guest
--     order insertion, while order mutations stay server-side (service role or
--     an Edge Function with the seller PIN). The admin dashboard is local-first
--     and mirrors changes opportunistically.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE product_category AS ENUM ('perfumes', 'clothes', 'accessories');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'pending_verification',
        'payment_confirmed',
        'dispatched',
        'completed',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('orange_money', 'fnb_pay2cell', 'cash_on_pickup');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE delivery_preference AS ENUM (
        'francistown_pickup',
        'local_courier',
        'nationwide_courier'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. CATALOG
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    category        product_category NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    base_price_bwp  NUMERIC(10, 2) NOT NULL CHECK (base_price_bwp >= 0),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_new_arrival  BOOLEAN NOT NULL DEFAULT FALSE,
    featured_tag    VARCHAR(64),
    image_urls      TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_active_category_idx
    ON products (is_active, category);

CREATE TABLE IF NOT EXISTS product_variants (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id            UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    sku                   VARCHAR(64) UNIQUE NOT NULL,
    size                  VARCHAR(16),
    color                 VARCHAR(64),
    volume_ml             SMALLINT CHECK (volume_ml IS NULL OR volume_ml > 0),
    scent_profile         VARCHAR(96),
    price_bwp             NUMERIC(10, 2) NOT NULL CHECK (price_bwp >= 0),
    stock_quantity        INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold   SMALLINT NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_variants_product_idx
    ON product_variants (product_id);

CREATE TABLE IF NOT EXISTS customer_reviews (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id    UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    customer_name VARCHAR(120) NOT NULL,
    town          VARCHAR(80) NOT NULL,
    rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT NOT NULL,
    is_verified   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_on   DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS customer_reviews_product_idx
    ON customer_reviews (product_id);

-- ----------------------------------------------------------------------------
-- 3. ORDERS
-- ----------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS order_ref_seq START WITH 8422;

CREATE TABLE IF NOT EXISTS orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number        VARCHAR(16) UNIQUE NOT NULL
                        DEFAULT 'ORD-' || LPAD(nextval('order_ref_seq')::TEXT, 4, '0'),
    customer_name       VARCHAR(160) NOT NULL,
    customer_phone      VARCHAR(24) NOT NULL,
    customer_town       VARCHAR(80) NOT NULL,
    customer_address    VARCHAR(255) NOT NULL DEFAULT '',
    delivery_preference delivery_preference NOT NULL DEFAULT 'francistown_pickup',
    -- Denormalised single-line destination kept for courier exports and receipts.
    delivery_location   VARCHAR(320) GENERATED ALWAYS AS (customer_town || ' - ' || customer_address) STORED,
    payment_method      payment_method NOT NULL,
    subtotal_bwp        NUMERIC(10, 2) NOT NULL CHECK (subtotal_bwp >= 0),
    discount_bwp        NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_bwp >= 0),
    bundle_discount_bwp NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (bundle_discount_bwp >= 0),
    promo_code          VARCHAR(32),
    promo_discount_bwp  NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (promo_discount_bwp >= 0),
    delivery_fee_bwp    NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee_bwp >= 0),
    total_amount_bwp    NUMERIC(10, 2) NOT NULL CHECK (total_amount_bwp >= 0),
    status              order_status NOT NULL DEFAULT 'pending_verification',
    verification_notes  TEXT,
    verified_at         TIMESTAMPTZ,
    -- Mobile money / Pay2Cell transaction ID quoted by the customer or read off the SMS.
    payment_reference   VARCHAR(64),
    cancelled_at        TIMESTAMPTZ,
    cancel_reason       VARCHAR(160),
    channel             VARCHAR(16) NOT NULL DEFAULT 'website',
    pickup_date         DATE,
    pickup_window       VARCHAR(24),
    pickup_point        VARCHAR(96),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT orders_total_matches_components
        CHECK (total_amount_bwp = subtotal_bwp - discount_bwp + delivery_fee_bwp)
);

CREATE INDEX IF NOT EXISTS orders_status_created_idx
    ON orders (status, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id                UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id              UUID REFERENCES products (id) ON DELETE SET NULL,
    variant_id              UUID REFERENCES product_variants (id) ON DELETE SET NULL,
    product_title_snapshot  VARCHAR(255) NOT NULL,
    variant_label_snapshot  VARCHAR(160) NOT NULL,
    unit_price_bwp          NUMERIC(10, 2) NOT NULL CHECK (unit_price_bwp >= 0),
    quantity                SMALLINT NOT NULL CHECK (quantity > 0),
    line_total_bwp          NUMERIC(10, 2) NOT NULL CHECK (line_total_bwp >= 0)
);

CREATE INDEX IF NOT EXISTS order_items_order_idx
    ON order_items (order_id);

-- Keep updated_at truthful for merchandising edits.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_touch_updated_at ON products;
CREATE TRIGGER products_touch_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Stamp verified_at the first time an order is marked payment_confirmed.
CREATE OR REPLACE FUNCTION stamp_order_verification() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'payment_confirmed' AND OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.verified_at = COALESCE(NEW.verified_at, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_stamp_verification ON orders;
CREATE TRIGGER orders_stamp_verification
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION stamp_order_verification();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reviews  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items       ENABLE ROW LEVEL SECURITY;

-- Public catalog browsing (active products only).
DROP POLICY IF EXISTS "public reads active products" ON products;
CREATE POLICY "public reads active products" ON products
    FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "public reads variants" ON product_variants;
CREATE POLICY "public reads variants" ON product_variants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products p
            WHERE p.id = product_variants.product_id AND p.is_active = TRUE
        )
    );

DROP POLICY IF EXISTS "public reads verified reviews" ON customer_reviews;
CREATE POLICY "public reads verified reviews" ON customer_reviews
    FOR SELECT USING (is_verified = TRUE);

-- Guest checkout: anyone may create an order, nobody may read them back with the
-- anon key. Both tables are insert-only for the public role.
DROP POLICY IF EXISTS "guests insert orders" ON orders;
CREATE POLICY "guests insert orders" ON orders
    FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "guests insert order items" ON order_items;
CREATE POLICY "guests insert order items" ON order_items
    FOR INSERT WITH CHECK (TRUE);

-- Order status changes and inventory edits are performed by the seller either
-- through the Supabase dashboard or an Edge Function using the service role
-- (which bypasses RLS). No anon UPDATE/DELETE policies are granted on purpose.

-- Optional read-only view for the seller dashboard using the service role.
CREATE OR REPLACE VIEW order_pipeline WITH (security_invoker = TRUE) AS
SELECT
    o.id,
    o.order_number,
    o.customer_name,
    o.customer_phone,
    o.customer_town,
    o.customer_address,
    o.delivery_preference,
    o.delivery_location,
    o.payment_method,
    o.subtotal_bwp,
    o.discount_bwp,
    o.bundle_discount_bwp,
    o.promo_code,
    o.delivery_fee_bwp,
    o.total_amount_bwp,
    o.channel,
    o.pickup_date,
    o.pickup_window,
    o.status,
    o.verification_notes,
    o.verified_at,
    o.payment_reference,
    o.cancelled_at,
    o.cancel_reason,
    o.created_at,
    COALESCE(SUM(oi.quantity), 0) AS total_units,
    COUNT(oi.id)                  AS line_count
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id;

-- ----------------------------------------------------------------------------
-- 5. SEED DATA — mirrors src/lib/mockData.ts
-- ----------------------------------------------------------------------------

INSERT INTO products (id, title, slug, category, description, base_price_bwp, is_active, is_new_arrival, featured_tag, image_urls)
VALUES
    ('11111111-1111-4111-8111-111111111101', 'Rouge Seduction Extrait de Parfum', 'rouge-seduction-extrait-de-parfum', 'perfumes',
     'A luminous amber-floral extrait built on saffron, radiant jasmine and warm cedarwood. High oil concentration for all-day wear in the Botswana heat.',
     280, TRUE, TRUE, 'Top Seller', ARRAY['/products/rouge-1.jpg', '/products/rouge-2.jpg']),
    ('11111111-1111-4111-8111-111111111102', 'Royal Oud & Amber Intense', 'royal-oud-amber-intense', 'perfumes',
     'Majestic Cambodian oud layered with smoky resin, Madagascar vanilla and amber crystals. Deep projection with a luxurious, long-lasting sillage.',
     460, TRUE, FALSE, 'Customer Favourite', ARRAY['/products/oud-1.jpg']),
    ('11111111-1111-4111-8111-111111111103', 'Warm Vanilla Caramel Extrait', 'warm-vanilla-caramel-extrait', 'perfumes',
     'A cosy gourmand of brown sugar, butterscotch and bourbon vanilla resting on creamy sandalwood. Sweet, warm and impossible to ignore.',
     260, TRUE, TRUE, 'Gourmand', ARRAY['/products/vanilla-1.jpg']),
    ('11111111-1111-4111-8111-111111111104', 'Oversized Breathable Linen Shirt', 'oversized-breathable-linen-shirt', 'clothes',
     '100% premium lightweight linen cut for Botswana summers. Relaxed drop-shoulder silhouette with natural shell buttons and a soft washed finish.',
     350, TRUE, TRUE, 'Summer Essential', ARRAY['/products/shirt-1.jpg', '/products/shirt-2.jpg']),
    ('11111111-1111-4111-8111-111111111105', 'High-Waisted Pleated Palazzo Trousers', 'high-waisted-pleated-palazzo-trousers', 'clothes',
     'Wide-leg pleated trousers with a flattering high-waist band and deep pockets. Fluid drape that works for the office or a weekend in the city.',
     380, TRUE, FALSE, NULL, ARRAY['/products/palazzo-1.jpg']),
    ('11111111-1111-4111-8111-111111111106', 'Structured Leatherette Shoulder Bag', 'structured-leatherette-shoulder-bag', 'accessories',
     'A minimalist shoulder baguette with brushed gold hardware, a zipped inner compartment and a comfortable padded strap.',
     290, TRUE, TRUE, NULL, ARRAY['/products/bag-1.jpg'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, sku, size, color, volume_ml, scent_profile, price_bwp, stock_quantity, low_stock_threshold)
VALUES
    ('22222222-2222-4222-8222-222222222101', '11111111-1111-4111-8111-111111111101', 'ROUGE-30ML', NULL, NULL, 30, 'Amber Floral & Saffron', 280, 9, 3),
    ('22222222-2222-4222-8222-222222222102', '11111111-1111-4111-8111-111111111101', 'ROUGE-50ML', NULL, NULL, 50, 'Amber Floral & Saffron', 420, 4, 3),
    ('22222222-2222-4222-8222-222222222103', '11111111-1111-4111-8111-111111111101', 'ROUGE-100ML', NULL, NULL, 100, 'Amber Floral & Saffron', 690, 2, 3),
    ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111102', 'OUD-50ML', NULL, NULL, 50, 'Smoky Oud & Amber', 460, 2, 2),
    ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111102', 'OUD-100ML', NULL, NULL, 100, 'Smoky Oud & Amber', 750, 0, 2),
    ('22222222-2222-4222-8222-222222222301', '11111111-1111-4111-8111-111111111103', 'VANILLA-30ML', NULL, NULL, 30, 'Warm Gourmand Vanilla', 260, 11, 3),
    ('22222222-2222-4222-8222-222222222302', '11111111-1111-4111-8111-111111111103', 'VANILLA-50ML', NULL, NULL, 50, 'Warm Gourmand Vanilla', 390, 7, 3),
    ('22222222-2222-4222-8222-222222222401', '11111111-1111-4111-8111-111111111104', 'SHIRT-CREAM-S', 'S', 'Natural Cream', NULL, NULL, 350, 6, 2),
    ('22222222-2222-4222-8222-222222222402', '11111111-1111-4111-8111-111111111104', 'SHIRT-CREAM-M', 'M', 'Natural Cream', NULL, NULL, 350, 5, 2),
    ('22222222-2222-4222-8222-222222222403', '11111111-1111-4111-8111-111111111104', 'SHIRT-CREAM-L', 'L', 'Natural Cream', NULL, NULL, 350, 2, 2),
    ('22222222-2222-4222-8222-222222222404', '11111111-1111-4111-8111-111111111104', 'SHIRT-OLIVE-M', 'M', 'Safari Olive', NULL, NULL, 350, 3, 2),
    ('22222222-2222-4222-8222-222222222405', '11111111-1111-4111-8111-111111111104', 'SHIRT-OLIVE-XL', 'XL', 'Safari Olive', NULL, NULL, 350, 0, 2),
    ('22222222-2222-4222-8222-222222222501', '11111111-1111-4111-8111-111111111105', 'PALAZZO-MOCHA-S', 'S', 'Rich Mocha', NULL, NULL, 380, 5, 2),
    ('22222222-2222-4222-8222-222222222502', '11111111-1111-4111-8111-111111111105', 'PALAZZO-MOCHA-M', 'M', 'Rich Mocha', NULL, NULL, 380, 2, 2),
    ('22222222-2222-4222-8222-222222222503', '11111111-1111-4111-8111-111111111105', 'PALAZZO-BLACK-L', 'L', 'Black', NULL, NULL, 380, 4, 2),
    ('22222222-2222-4222-8222-222222222601', '11111111-1111-4111-8111-111111111106', 'BAG-TAN', NULL, 'Tan', NULL, NULL, 290, 8, 2),
    ('22222222-2222-4222-8222-222222222602', '11111111-1111-4111-8111-111111111106', 'BAG-ONYX-BLACK', NULL, 'Onyx Black', NULL, NULL, 290, 3, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_reviews (product_id, customer_name, town, rating, comment, reviewed_on)
VALUES
    ('11111111-1111-4111-8111-111111111101', 'Keabetswe M.', 'Francistown', 5, 'Rouge Seduction lasts the whole day even in this heat. My colleagues keep asking what I am wearing.', '2026-09-05'),
    ('11111111-1111-4111-8111-111111111101', 'Mpho T.', 'Gaborone', 5, 'The saffron and amber notes are rich and sophisticated. Paying with Orange Money took seconds.', '2026-08-29'),
    ('11111111-1111-4111-8111-111111111102', 'Letsile K.', 'Francistown', 5, 'This oud is the real deal — smoky and deep. Collected the same afternoon at Galo Mall.', '2026-09-07'),
    ('11111111-1111-4111-8111-111111111103', 'Bontle S.', 'Palapye', 5, 'Warm Vanilla Caramel smells like dessert in a bottle. Sprint Couriers delivered to Palapye in two days.', '2026-09-01'),
    ('11111111-1111-4111-8111-111111111103', 'Amantle K.', 'Tonota', 5, 'Cosy, sweet and it never fades. I already ordered a second bottle for my sister.', '2026-09-09'),
    ('11111111-1111-4111-8111-111111111104', 'Tshiamo R.', 'Francistown', 5, 'Perfect shirt for Francistown weather. Breathable linen and the relaxed fit still looks sharp.', '2026-09-08'),
    ('11111111-1111-4111-8111-111111111104', 'Naledi D.', 'Maun', 4, 'Safari Olive is a gorgeous colour and the quality is superb. Runs generously, which I prefer.', '2026-09-04'),
    ('11111111-1111-4111-8111-111111111106', 'Lesego P.', 'Gaborone', 5, 'Stunning for the price — the gold hardware lifts the whole outfit. Nationwide delivery was quick.', '2026-09-06');

-- ----------------------------------------------------------------------------
-- 6. ACCEPTANCE CHECKS (run manually after applying)
-- ----------------------------------------------------------------------------
-- SELECT category, COUNT(*) FROM products WHERE is_active GROUP BY category;
-- SELECT sku, stock_quantity FROM product_variants ORDER BY stock_quantity ASC LIMIT 5;
-- SELECT order_number, status, total_amount_bwp FROM order_pipeline ORDER BY created_at DESC LIMIT 10;
-- SELECT status, COUNT(*), SUM(total_amount_bwp) FROM orders GROUP BY status;
