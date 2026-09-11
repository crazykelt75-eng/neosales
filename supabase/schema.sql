-- ============================================================================
-- NEOSALES BOTSWANA - PRODUCTION DATABASE SCHEMA & SEED DATA
-- Target: Supabase (PostgreSQL 15+)
-- Currency Standard: BWP (Botswana Pula)
-- Physical Hub: Francistown & Tati Siding, North-East District, Botswana
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE product_category AS ENUM ('clothes', 'perfumes', 'accessories');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'pending_verification',
        'payment_confirmed',
        'ready_for_pickup',
        'out_for_delivery',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_channel AS ENUM ('fnb_pay2cell', 'orange_money');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE delivery_type AS ENUM (
        'collection',
        'local_courier',
        'in_person_meetup'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category product_category NOT NULL,
    description TEXT,
    base_price_bwp NUMERIC(10, 2) NOT NULL CHECK (base_price_bwp >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_new_arrival BOOLEAN NOT NULL DEFAULT false,
    featured_tag VARCHAR(64),
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PRODUCT VARIANTS TABLE
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(64) UNIQUE NOT NULL,
    size VARCHAR(16),
    color VARCHAR(32),
    volume_ml INT CHECK (volume_ml > 0),
    scent_profile VARCHAR(64),
    price_bwp NUMERIC(10, 2) NOT NULL CHECK (price_bwp >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category) WHERE is_active = true;

-- 4. CUSTOMER REVIEWS TABLE (Spotlight & Social Proof)
CREATE TABLE IF NOT EXISTS customer_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_name VARCHAR(128) NOT NULL,
    town VARCHAR(64) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT true,
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON customer_reviews(product_id);

-- 5. SELLER CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS seller_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name VARCHAR(64) NOT NULL DEFAULT 'NeoSales',
    hub_location VARCHAR(128) NOT NULL DEFAULT 'Francistown & Tati Siding',
    seller_whatsapp VARCHAR(20) NOT NULL DEFAULT '+26772123456',
    orange_money_number VARCHAR(20) NOT NULL DEFAULT '72123456',
    fnb_pay2cell_number VARCHAR(20) NOT NULL DEFAULT '74123456',
    fnb_account_name VARCHAR(64) NOT NULL DEFAULT 'NeoSales Retail',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(128) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    delivery_town VARCHAR(64) NOT NULL,
    delivery_address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);

-- 7. ORDERS TABLE
CREATE SEQUENCE IF NOT EXISTS order_ref_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(24) UNIQUE NOT NULL DEFAULT ('ORD-' || nextval('order_ref_seq')),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(128) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    delivery_preference delivery_type NOT NULL DEFAULT 'collection',
    delivery_location TEXT NOT NULL,
    payment_method payment_channel NOT NULL,
    subtotal_bwp NUMERIC(10, 2) NOT NULL CHECK (subtotal_bwp >= 0),
    delivery_fee_bwp NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee_bwp >= 0),
    total_amount_bwp NUMERIC(10, 2) NOT NULL CHECK (total_amount_bwp >= 0),
    status order_status NOT NULL DEFAULT 'pending_verification',
    payment_proof_url TEXT,
    verification_notes TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 8. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    product_title_snapshot VARCHAR(255) NOT NULL,
    variant_label_snapshot VARCHAR(128) NOT NULL,
    unit_price_bwp NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    line_total_bwp NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 9. STOCK AUTOMATION TRIGGER
CREATE OR REPLACE FUNCTION handle_order_status_stock_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'payment_confirmed' AND OLD.status = 'pending_verification' THEN
        UPDATE product_variants pv
        SET stock_quantity = pv.stock_quantity - oi.quantity,
            updated_at = NOW()
        FROM order_items oi
        WHERE oi.order_id = NEW.id
          AND pv.id = oi.variant_id;
        NEW.verified_at = NOW();
    END IF;

    IF NEW.status = 'cancelled' AND OLD.status IN ('payment_confirmed', 'ready_for_pickup') THEN
        UPDATE product_variants pv
        SET stock_quantity = pv.stock_quantity + oi.quantity,
            updated_at = NOW()
        FROM order_items oi
        WHERE oi.order_id = NEW.id
          AND pv.id = oi.variant_id;
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_status_stock_sync ON orders;
CREATE TRIGGER trg_order_status_stock_sync
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION handle_order_status_stock_sync();

-- 10. ROW LEVEL SECURITY (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Public can read active products, variants, reviews, and store configs
CREATE POLICY "Public read active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public read variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Public read reviews" ON customer_reviews FOR SELECT USING (true);
CREATE POLICY "Public read seller config" ON seller_configs FOR SELECT USING (true);

-- Public can create orders and customers (Guest Checkout)
CREATE POLICY "Public insert customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert order_items" ON order_items FOR INSERT WITH CHECK (true);

-- Authenticated sellers can perform all operations
CREATE POLICY "Seller all access products" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Seller all access variants" ON product_variants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Seller all access reviews" ON customer_reviews FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Seller all access configs" ON seller_configs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Seller all access orders" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Seller all access order_items" ON order_items FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- 11. SEED DATA
-- ============================================================================

-- Initial Seller Configuration
INSERT INTO seller_configs (store_name, hub_location, seller_whatsapp, orange_money_number, fnb_pay2cell_number, fnb_account_name)
VALUES ('NeoSales', 'Francistown & Tati Siding', '+26772123456', '72123456', '74123456', 'NeoSales Retail')
ON CONFLICT DO NOTHING;

-- Seed Products
INSERT INTO products (id, title, slug, category, description, base_price_bwp, is_active, is_new_arrival, featured_tag, image_urls)
VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'Rouge Seduction Extrait de Parfum',
    'rouge-seduction-extrait',
    'perfumes',
    'A luminous and sophisticated amber-floral fragrance with rich saffron, cedarwood, and radiant jasmine notes. Long-lasting oil-based formula.',
    280.00,
    true,
    true,
    'Top Seller',
    ARRAY['https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800&auto=format&fit=crop&q=80']
),
(
    '00000000-0000-0000-0000-000000000002',
    'Royal Oud & Amber Intense',
    'royal-oud-amber-intense',
    'perfumes',
    'Majestic Cambodian oud infused with deep smoky resin, Madagascar vanilla, and warm amber crystals. High projection and luxury sillage.',
    320.00,
    true,
    false,
    'Customer Favorite',
    ARRAY['https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&auto=format&fit=crop&q=80']
),
(
    '00000000-0000-0000-0000-000000000003',
    'Warm Vanilla & Salted Caramel Extrait',
    'warm-vanilla-salted-caramel',
    'perfumes',
    'A decadent gourmand perfume oil combining caramelized sugar, toasted tonka, and creamy bourbon vanilla. Perfect evening scent.',
    250.00,
    true,
    true,
    'Viral Scent',
    ARRAY['https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=80']
),
(
    '00000000-0000-0000-0000-000000000004',
    'Oversized Breathable Linen Shirt',
    'oversized-breathable-linen-shirt',
    'clothes',
    'Premium 100% natural pre-washed flax linen tailored for hot Botswana summer days. Relaxed dropped shoulders and clean mandarin collar.',
    350.00,
    true,
    true,
    'Summer Essential',
    ARRAY['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80']
),
(
    '00000000-0000-0000-0000-000000000005',
    'Relaxed Fit Linen Trousers',
    'relaxed-fit-linen-trousers',
    'clothes',
    'Lightweight linen pants featuring an elasticated drawstring waistband, deep side pockets, and a clean tapered ankle cut.',
    380.00,
    true,
    false,
    'Restocked',
    ARRAY['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80']
),
(
    '00000000-0000-0000-0000-000000000006',
    'Structured Leatherette Shoulder Bag',
    'structured-leatherette-shoulder-bag',
    'accessories',
    'Compact yet spacious everyday shoulder bag with brushed gold-toned hardware, magnetic snap flap, and detachable crossbody strap.',
    290.00,
    true,
    true,
    'New Arrival',
    ARRAY['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80']
)
ON CONFLICT (slug) DO NOTHING;

-- Seed Product Variants
INSERT INTO product_variants (product_id, sku, volume_ml, scent_profile, size, color, price_bwp, stock_quantity, low_stock_threshold)
VALUES
('00000000-0000-0000-0000-000000000001', 'ROUGE-30ML', 30, 'Amber Floral & Saffron', null, null, 280.00, 8, 3),
('00000000-0000-0000-0000-000000000001', 'ROUGE-50ML', 50, 'Amber Floral & Saffron', null, null, 420.00, 4, 3),
('00000000-0000-0000-0000-000000000001', 'ROUGE-100ML', 100, 'Amber Floral & Saffron', null, null, 690.00, 2, 3),
('00000000-0000-0000-0000-000000000002', 'OUD-30ML', 30, 'Cambodian Oud & Smoky Resin', null, null, 320.00, 5, 2),
('00000000-0000-0000-0000-000000000002', 'OUD-50ML', 50, 'Cambodian Oud & Smoky Resin', null, null, 490.00, 1, 2),
('00000000-0000-0000-0000-000000000003', 'VAN-30ML', 30, 'Warm Bourbon Vanilla & Caramel', null, null, 250.00, 9, 3),
('00000000-0000-0000-0000-000000000003', 'VAN-50ML', 50, 'Warm Bourbon Vanilla & Caramel', null, null, 380.00, 3, 3),
('00000000-0000-0000-0000-000000000004', 'SHIRT-S-CRM', null, null, 'S', 'Natural Cream', 350.00, 4, 2),
('00000000-0000-0000-0000-000000000004', 'SHIRT-M-CRM', null, null, 'M', 'Natural Cream', 350.00, 6, 2),
('00000000-0000-0000-0000-000000000004', 'SHIRT-L-OLV', null, null, 'L', 'Safari Olive', 350.00, 3, 2),
('00000000-0000-0000-0000-000000000005', 'PANTS-M-BLK', null, null, 'M', 'Charcoal Black', 380.00, 5, 2),
('00000000-0000-0000-0000-000000000005', 'PANTS-L-SND', null, null, 'L', 'Kalahari Sand', 380.00, 2, 2),
('00000000-0000-0000-0000-000000000006', 'BAG-TAN', null, null, null, 'Caramel Tan', 290.00, 7, 2),
('00000000-0000-0000-0000-000000000006', 'BAG-BLK', null, null, null, 'Onyx Black', 290.00, 3, 2)
ON CONFLICT (sku) DO NOTHING;

-- Seed Customer Reviews
INSERT INTO customer_reviews (product_id, customer_name, town, rating, comment, verified, review_date)
VALUES
('00000000-0000-0000-0000-000000000001', 'Kgomotso M.', 'Francistown', 5, 'The Rouge Seduction extrait lasts ALL day in the Francistown heat. Collected mine at Nswazii Mall within 2 hours of ordering. Absolutely premium packaging!', true, '2026-09-05'),
('00000000-0000-0000-0000-000000000001', 'Mpho T.', 'Gaborone', 5, 'Best niche perfume I have found in Botswana. The amber saffron notes are rich and sophisticated. Orange Money payment was seamless!', true, '2026-09-03'),
('00000000-0000-0000-0000-000000000002', 'Letsile K.', 'Tati Siding', 5, 'This oud is the real deal — smoky, deep, masculine. Picked up from Tati Siding same day. NeoSales customer service is top-notch!', true, '2026-09-07'),
('00000000-0000-0000-0000-000000000003', 'Bontle S.', 'Palapye', 5, 'The Warm Vanilla Caramel smells like heaven! Sweet but not overpowering. Sprint Courier delivered to Palapye in 2 days.', true, '2026-09-01'),
('00000000-0000-0000-0000-000000000004', 'Tshiamo R.', 'Francistown', 5, 'Perfect summer shirt for Francistown weather. The linen is breathable and the fit is relaxed but still looks sharp. Ordered via FNB Pay2Cell — zero stress.', true, '2026-09-08'),
('00000000-0000-0000-0000-000000000006', 'Lesego P.', 'Gaborone', 5, 'This bag is stunning for the price! The gold hardware gives it a luxury feel. Picked it up at Galo Mall — such a convenient system.', true, '2026-09-06')
ON CONFLICT DO NOTHING;
