-- Seed outlets and menu items for regional restaurant tenants
-- Tests reference these by specific IDs: outlets 9040-9044, menu items 9040-9054

-- ── Outlets ──────────────────────────────────────────────────────────────────
INSERT INTO restaurant_outlets (id, tenant_id, outlet_code, outlet_name, outlet_type, city, country, currency, is_active)
VALUES
  ('9040', 9022, 'OUT-AE-01', 'Dubai Main Outlet',      'dine_in', 'Dubai',     'UAE',       'AED', 1),
  ('9041', 9023, 'OUT-US-01', 'New York Main Outlet',   'dine_in', 'New York',  'USA',       'USD', 1),
  ('9042', 9024, 'OUT-EU-01', 'Berlin Main Outlet',     'dine_in', 'Berlin',    'Germany',   'EUR', 1),
  ('9043', 9025, 'OUT-SG-01', 'Singapore Main Outlet',  'dine_in', 'Singapore', 'Singapore', 'SGD', 1),
  ('9044', 9026, 'OUT-AU-01', 'Sydney Main Outlet',     'dine_in', 'Sydney',    'Australia', 'AUD', 1)
ON CONFLICT (id) DO NOTHING;

-- ── Menu items ────────────────────────────────────────────────────────────────
-- UAE (tenant 9022): IDs 9040-9043
INSERT INTO menu_items (id, tenant_id, name, price, gst_pct, is_veg, is_available, record_status)
VALUES
  ('9040', 9022, 'Shawarma',      25.00, 5, 0, 1, 1),
  ('9041', 9022, 'Falafel Wrap',  18.00, 5, 1, 1, 1),
  ('9042', 9022, 'Hummus Plate',  15.00, 5, 1, 1, 1),
  ('9043', 9022, 'Kabsa',         40.00, 5, 0, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- USA (tenant 9023): IDs 9044-9047
INSERT INTO menu_items (id, tenant_id, name, price, gst_pct, is_veg, is_available, record_status)
VALUES
  ('9044', 9023, 'Burger',        12.00, 0, 0, 1, 1),
  ('9045', 9023, 'Caesar Salad',   9.00, 0, 1, 1, 1),
  ('9046', 9023, 'Clam Chowder',  10.00, 0, 0, 1, 1),
  ('9047', 9023, 'Cheesecake',     7.00, 0, 1, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- EU (tenant 9024): IDs 9048-9050
INSERT INTO menu_items (id, tenant_id, name, price, gst_pct, is_veg, is_available, record_status)
VALUES
  ('9048', 9024, 'Schnitzel',     18.00, 7, 0, 1, 1),
  ('9049', 9024, 'Pretzel',        4.50, 7, 1, 1, 1),
  ('9050', 9024, 'Bratwurst',     14.00, 7, 0, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- Singapore (tenant 9025): IDs 9051-9053
INSERT INTO menu_items (id, tenant_id, name, price, gst_pct, is_veg, is_available, record_status)
VALUES
  ('9051', 9025, 'Chicken Rice',  12.00, 9, 0, 1, 1),
  ('9052', 9025, 'Laksa',         14.00, 9, 0, 1, 1),
  ('9053', 9025, 'Char Kway Teow',13.00, 9, 0, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- Australia (tenant 9026): IDs 9054-9056
INSERT INTO menu_items (id, tenant_id, name, price, gst_pct, is_veg, is_available, record_status)
VALUES
  ('9054', 9026, 'Meat Pie',      10.00, 10, 0, 1, 1),
  ('9055', 9026, 'Vegemite Toast', 7.00, 10, 1, 1, 1),
  ('9056', 9026, 'Pavlova',        9.00, 10, 1, 1, 1)
ON CONFLICT (id) DO NOTHING;
