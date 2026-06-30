-- Task 10: Restaurant Online Ordering — add slug and delivery fields to restaurant_outlets
ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS online_ordering_enabled INTEGER DEFAULT 0;
ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS delivery_radius_km DECIMAL(5,2) DEFAULT 5;
ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS min_order_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS estimated_delivery_min INTEGER DEFAULT 30;
ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS description TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_outlets_slug ON restaurant_outlets(slug) WHERE slug IS NOT NULL;
