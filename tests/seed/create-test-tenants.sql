-- QA Test Tenant Seed Script
-- Run once against a test DB (or dev DB after backup)
-- Creates 4 tenants: IN, AE, US, EU with realistic data

BEGIN;

-- ============================================================
-- 1. TENANTS
-- ============================================================
INSERT INTO tenants (id, name, subdomain, plan, country_code, currency_code, currency_symbol, tax_regime, default_locale, is_active, created_at)
VALUES
  (9001, 'Kinto India Test',     'qa-in',  'restaurant_enterprise', 'IN', 'INR', '₹',  'GST',       'en-IN', true, NOW()),
  (9002, 'Kinto UAE Test',       'qa-ae',  'hotel_professional',    'AE', 'AED', 'د.إ','VAT',       'ar-AE', true, NOW()),
  (9003, 'Kinto USA Test',       'qa-us',  'retail_professional',   'US', 'USD', '$',  'SALES_TAX', 'en-US', true, NOW()),
  (9004, 'Kinto Europe Test',    'qa-eu',  'manufacturing_enterprise','DE','EUR', '€',  'VAT',       'de-DE', true, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  plan = EXCLUDED.plan,
  country_code = EXCLUDED.country_code,
  currency_code = EXCLUDED.currency_code,
  currency_symbol = EXCLUDED.currency_symbol,
  tax_regime = EXCLUDED.tax_regime,
  default_locale = EXCLUDED.default_locale;

-- ============================================================
-- 2. ADMIN USERS (password: Test@1234 — bcrypt hash)
-- ============================================================
INSERT INTO users (id, tenant_id, username, password, role, full_name, email, is_active)
VALUES
  (9001, 9001, 'qa_admin_in',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'admin',   'QA Admin India',  'qa-in@test.kinto',  true),
  (9002, 9001, 'qa_staff_in',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'staff',   'QA Staff India',  'qa-staff@test.kinto', true),
  (9003, 9002, 'qa_admin_ae',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'admin',   'QA Admin UAE',    'qa-ae@test.kinto',  true),
  (9004, 9003, 'qa_admin_us',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'admin',   'QA Admin USA',    'qa-us@test.kinto',  true),
  (9005, 9004, 'qa_admin_eu',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'admin',   'QA Admin EU',     'qa-eu@test.kinto',  true)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  username = EXCLUDED.username,
  role = EXCLUDED.role;

-- ============================================================
-- 3. CUSTOMERS (5 per tenant)
-- ============================================================
INSERT INTO customers (id, tenant_id, name, phone, email, address, gstin, is_active)
VALUES
  -- IN tenant
  (9001, 9001, 'Ravi Shankar Enterprises', '9876543210', 'ravi@rsent.in',  'Mumbai, MH', '27AABCU9603R1ZX', true),
  (9002, 9001, 'Priya Foods Pvt Ltd',      '9123456780', 'priya@foods.in', 'Pune, MH',   '27AABCU9603R1ZY', true),
  (9003, 9001, 'Delhi Spice House',        '9011223344', 'spice@delhi.in', 'New Delhi',  '07AABCU9603R1ZX', true),
  (9004, 9001, 'Walk-In Customer IN',      NULL,         NULL,             'Counter',    NULL,              true),
  (9005, 9001, 'Wholesale Buyer IN',       '9988776655', 'bulk@buyer.in',  'Chennai',    '33AABCU9603R1ZX', true),
  -- AE tenant
  (9006, 9002, 'Al Mansoor Trading LLC',   '+971501234567', 'am@trading.ae', 'Dubai',    NULL,              true),
  (9007, 9002, 'Dubai Hotels Group',       '+971502345678', 'dhg@hotels.ae', 'Abu Dhabi', NULL,             true),
  (9008, 9002, 'Walk-In Customer AE',      NULL,         NULL,             'Counter',    NULL,              true),
  (9009, 9002, 'Emirates Corporate',       '+971503456789', 'corp@ec.ae',   'Sharjah',   NULL,             true),
  (9010, 9002, 'Gulf Hospitality Co',      '+971504567890', 'gh@hosp.ae',   'Dubai',     NULL,             true),
  -- US tenant
  (9011, 9003, 'Smith Retail Group',       '5551234567', 'smith@retail.us', 'New York, NY',    NULL,        true),
  (9012, 9003, 'Johnson & Sons Inc',       '5552345678', 'johnson@inc.us',  'Los Angeles, CA', NULL,        true),
  (9013, 9003, 'Walk-In Customer US',      NULL,         NULL,              'Counter',         NULL,        true),
  (9014, 9003, 'MidWest Distributors',     '5553456789', 'mid@dist.us',    'Chicago, IL',     NULL,        true),
  (9015, 9003, 'Tech Valley Corp',         '5554567890', 'tech@valley.us', 'San Jose, CA',    NULL,        true),
  -- EU tenant
  (9016, 9004, 'Mueller GmbH',             '+4930123456', 'info@mueller.de',  'Berlin',   'DE123456789',  true),
  (9017, 9004, 'Paris Distributors SARL',  '+33612345678', 'pd@paris.fr',    'Paris',    'FR12345678901', true),
  (9018, 9004, 'Walk-In Customer EU',      NULL,          NULL,              'Counter',   NULL,            true),
  (9019, 9004, 'Amsterdam Trade BV',       '+31612345678', 'atb@ams.nl',    'Amsterdam', 'NL123456789B01',true),
  (9020, 9004, 'Milano Imports SRL',       '+39012345678', 'mi@imports.it', 'Milan',     'IT12345678901', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================
-- 4. PRODUCTS (10 per tenant, with HSN/tax codes)
-- ============================================================
INSERT INTO products (id, tenant_id, name, code, hsn_code, unit, price, tax_rate, category, stock_quantity, is_active)
VALUES
  -- IN tenant (GST rates)
  (9001, 9001, 'Paneer Butter Masala',  'PBM001', '2106', 'plate', 320.00,  5.0, 'Food',     100, true),
  (9002, 9001, 'Dal Makhani',           'DM001',  '2106', 'plate', 280.00,  5.0, 'Food',     100, true),
  (9003, 9001, 'Tandoori Roti',         'TR001',  '1905', 'piece', 30.00,   5.0, 'Bread',    500, true),
  (9004, 9001, 'Mineral Water 1L',      'MW001',  '2201', 'bottle',40.00,   18.0,'Beverages', 200, true),
  (9005, 9001, 'Cold Drink 300ml',      'CD001',  '2202', 'bottle',60.00,   28.0,'Beverages', 200, true),
  (9006, 9001, 'Masala Chai',           'MC001',  '0902', 'cup',   30.00,   5.0, 'Beverages', 200, true),
  (9007, 9001, 'Biryani Special',       'BS001',  '2106', 'plate', 450.00,  5.0, 'Food',     50,  true),
  (9008, 9001, 'Ice Cream Scoop',       'IC001',  '2105', 'scoop', 80.00,   18.0,'Dessert',  100, true),
  (9009, 9001, 'Service Charge',        'SC001',  '9963', 'flat',  0.00,    0.0, 'Service',  999, true),
  (9010, 9001, 'Takeaway Box',          'TB001',  '3923', 'piece', 10.00,   18.0,'Packaging', 500, true),
  -- AE tenant (5% VAT)
  (9011, 9002, 'Deluxe Room Night',     'DR001',  NULL,   'night', 850.00,  5.0, 'Accommodation', 50, true),
  (9012, 9002, 'Suite Night',           'SN001',  NULL,   'night', 1800.00, 5.0, 'Accommodation', 10, true),
  (9013, 9002, 'Airport Transfer',      'AT001',  NULL,   'trip',  250.00,  5.0, 'Transport', 99, true),
  (9014, 9002, 'Breakfast Buffet',      'BB001',  NULL,   'person',120.00,  5.0, 'F&B',      200, true),
  (9015, 9002, 'Spa Package',           'SP001',  NULL,   'session',400.00, 5.0, 'Wellness', 20,  true),
  (9016, 9002, 'Conference Room Half',  'CR001',  NULL,   'half',  2000.00, 5.0, 'Events',   5,   true),
  (9017, 9002, 'Laundry Service',       'LS001',  NULL,   'kg',    45.00,   5.0, 'Services', 999, true),
  (9018, 9002, 'Minibar Refresh',       'MBR001', NULL,   'flat',  150.00,  5.0, 'F&B',      99,  true),
  (9019, 9002, 'Parking (24h)',         'PK001',  NULL,   'day',   80.00,   5.0, 'Parking',  30,  true),
  (9020, 9002, 'Restaurant Meal',       'RM001',  NULL,   'cover', 200.00,  5.0, 'F&B',      999, true),
  -- US tenant (sales tax varies by state — stored at rate 0 since calculated externally)
  (9021, 9003, 'Laptop 15 inch',        'LPT001', NULL,   'unit',  999.99,  8.0, 'Electronics', 50, true),
  (9022, 9003, 'Wireless Mouse',        'WM001',  NULL,   'unit',  29.99,   8.0, 'Electronics', 200, true),
  (9023, 9003, 'Office Chair',          'OC001',  NULL,   'unit',  349.99,  8.0, 'Furniture',   30, true),
  (9024, 9003, 'USB Hub 4-port',        'UH001',  NULL,   'unit',  19.99,   8.0, 'Electronics', 300, true),
  (9025, 9003, 'Monitor 27 inch',       'MN001',  NULL,   'unit',  499.99,  8.0, 'Electronics', 25, true),
  (9026, 9003, 'Desk Lamp LED',         'DL001',  NULL,   'unit',  49.99,   8.0, 'Accessories', 100, true),
  (9027, 9003, 'Headphones BT',         'HP001',  NULL,   'unit',  149.99,  8.0, 'Electronics', 75, true),
  (9028, 9003, 'Keyboard Mechanical',   'KB001',  NULL,   'unit',  89.99,   8.0, 'Electronics', 60, true),
  (9029, 9003, 'Webcam 1080p',          'WC001',  NULL,   'unit',  79.99,   8.0, 'Electronics', 80, true),
  (9030, 9003, 'Printer Laser',         'PR001',  NULL,   'unit',  299.99,  8.0, 'Electronics', 15, true),
  -- EU tenant (19% German VAT)
  (9031, 9004, 'CNC Machine Part A',    'CNC001', NULL,   'unit',  1250.00, 19.0,'Machinery',  20, true),
  (9032, 9004, 'Steel Rod 6m',          'SR001',  NULL,   'piece', 89.50,   19.0,'Raw Material',500, true),
  (9033, 9004, 'Aluminum Sheet 2mm',    'AS001',  NULL,   'm2',    45.00,   19.0,'Raw Material',200, true),
  (9034, 9004, 'Bearing 6205',          'BR001',  NULL,   'unit',  12.50,   19.0,'Components',1000, true),
  (9035, 9004, 'Motor 3kW',             'MT001',  NULL,   'unit',  650.00,  19.0,'Electrical', 30, true),
  (9036, 9004, 'Control Panel',         'CP001',  NULL,   'unit',  2800.00, 19.0,'Electrical', 10, true),
  (9037, 9004, 'Safety Valve DN50',     'SV001',  NULL,   'unit',  185.00,  19.0,'Components', 50, true),
  (9038, 9004, 'Gearbox Type-B',        'GB001',  NULL,   'unit',  920.00,  19.0,'Machinery',  15, true),
  (9039, 9004, 'Hydraulic Cylinder',    'HC001',  NULL,   'unit',  475.00,  19.0,'Machinery',  25, true),
  (9040, 9004, 'Assembly Labor /hr',    'AL001',  NULL,   'hour',  95.00,   19.0,'Service',   999, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;

-- ============================================================
-- 5. VENDORS / SUPPLIERS (3 per tenant)
-- ============================================================
INSERT INTO vendors (id, tenant_id, name, contact_person, phone, email, gstin, payment_terms, is_active)
VALUES
  (9001, 9001, 'Fresh Farms Pvt Ltd',       'Suresh Kumar',  '9811223344', 'fresh@farms.in',    '09AABCU1111R1ZX', 30, true),
  (9002, 9001, 'Spice World Mumbai',         'Anita Sharma',  '9922334455', 'spice@world.in',    '27AABCU2222R1ZX', 15, true),
  (9003, 9001, 'National Beverages Dist',   'Raj Patel',     '9033445566', 'nb@dist.in',        '24AABCU3333R1ZX', 45, true),
  (9004, 9002, 'UAE Fresh Produce LLC',     'Khalid Al Mansoori', '+97150111', 'fresh@uae.ae',  NULL,              30, true),
  (9005, 9002, 'Dubai Linen Supplies',      'Fatima Hassan', '+97150222',  'linen@dubai.ae',    NULL,              15, true),
  (9006, 9002, 'Gulf F&B Wholesale',        'Ahmed Rashid',  '+97150333',  'fnb@gulf.ae',       NULL,              45, true),
  (9007, 9003, 'TechSource Distributors',   'Mike Johnson',  '5559001234', 'ts@dist.us',        NULL,              30, true),
  (9008, 9003, 'Office Supplies Direct',    'Sarah Williams','5559002345', 'osd@direct.us',     NULL,              15, true),
  (9009, 9003, 'West Coast Electronics',    'Tom Davis',     '5559003456', 'wce@elec.us',       NULL,              45, true),
  (9010, 9004, 'Stahl AG München',          'Hans Mueller',  '+4989111222','stahl@ag.de',       'DE111222333',     30, true),
  (9011, 9004, 'European Parts GmbH',       'Anna Schmidt',  '+4930222333','ep@parts.de',       'DE222333444',     15, true),
  (9012, 9004, 'Nordic Supplies AB',        'Erik Johansson','+46812345','ns@supplies.se',      'SE123456789001',  45, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================
-- 6. EMPLOYEES (2 per tenant)
-- ============================================================
INSERT INTO hr_employees (id, tenant_id, employee_id, first_name, last_name, designation, department, basic_salary, phone, email, date_of_joining, is_active)
VALUES
  (9001, 9001, 'EMP-IN-001', 'Vikram',  'Mehta',     'Head Chef',        'Kitchen',  45000.00, '9800001111', 'vikram@kintoin.test', '2024-01-01', true),
  (9002, 9001, 'EMP-IN-002', 'Sunita',  'Rao',       'Floor Manager',    'FOH',      35000.00, '9800002222', 'sunita@kintoin.test', '2024-01-01', true),
  (9003, 9002, 'EMP-AE-001', 'Faisal',  'Al Hashmi', 'Front Desk Mgr',   'FrontDesk',12000.00, '+971551111', 'faisal@kintoae.test', '2024-01-01', true),
  (9004, 9002, 'EMP-AE-002', 'Noura',   'Al Farsi',  'Housekeeping Sup', 'HK',       8500.00,  '+971552222', 'noura@kintoae.test',  '2024-01-01', true),
  (9005, 9003, 'EMP-US-001', 'James',   'Wilson',    'Store Manager',    'Sales',    72000.00, '5559010001', 'james@kintous.test',  '2024-01-01', true),
  (9006, 9003, 'EMP-US-002', 'Emily',   'Chen',      'Inventory Lead',   'Warehouse',58000.00, '5559010002', 'emily@kintous.test',  '2024-01-01', true),
  (9007, 9004, 'EMP-EU-001', 'Klaus',   'Becker',    'Production Mgr',   'Production',75000.00,'+4915111111','klaus@kintoeu.test',  '2024-01-01', true),
  (9008, 9004, 'EMP-EU-002', 'Ingrid',  'Braun',     'Quality Inspector','QA',        62000.00,'+4915222222','ingrid@kintoeu.test', '2024-01-01', true)
ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name;

-- ============================================================
-- 7. BANK ACCOUNTS (1 per tenant)
-- ============================================================
INSERT INTO bank_accounts (id, tenant_id, account_name, bank_name, account_number, ifsc_code, opening_balance, current_balance, is_active)
VALUES
  (9001, 9001, 'HDFC Main Account',    'HDFC Bank',    '50100123456789', 'HDFC0001234', 500000.00, 500000.00, true),
  (9002, 9002, 'Emirates NBD Main',    'Emirates NBD', 'AE070331234567890123456', NULL, 200000.00, 200000.00, true),
  (9003, 9003, 'Chase Business Chk',   'JPMorgan Chase','123456789012',  NULL,          150000.00, 150000.00, true),
  (9004, 9004, 'Deutsche Bank Konto',  'Deutsche Bank', 'DE89370400440532013000', NULL, 300000.00, 300000.00, true)
ON CONFLICT (id) DO UPDATE SET account_name = EXCLUDED.account_name;

-- ============================================================
-- 8. INVOICES (2 per tenant — one paid, one unpaid)
-- ============================================================
INSERT INTO invoices (id, tenant_id, invoice_number, customer_id, invoice_date, due_date, subtotal, tax_amount, total_amount, paid_amount, status, notes)
VALUES
  -- IN tenant
  (9001, 9001, 'INV-QA-IN-001', 9001, CURRENT_DATE - 10, CURRENT_DATE + 20, 600.00,  57.00, 657.00,  657.00, 'paid',    'QA seed invoice'),
  (9002, 9001, 'INV-QA-IN-002', 9002, CURRENT_DATE - 5,  CURRENT_DATE + 25, 1200.00, 114.00,1314.00, 0.00,   'unpaid',  'QA seed invoice'),
  -- AE tenant
  (9003, 9002, 'INV-QA-AE-001', 9006, CURRENT_DATE - 8,  CURRENT_DATE + 22, 2050.00, 102.50,2152.50, 2152.50,'paid',    'QA seed invoice'),
  (9004, 9002, 'INV-QA-AE-002', 9007, CURRENT_DATE - 3,  CURRENT_DATE + 27, 5400.00, 270.00,5670.00, 0.00,   'unpaid',  'QA seed invoice'),
  -- US tenant
  (9005, 9003, 'INV-QA-US-001', 9011, CURRENT_DATE - 7,  CURRENT_DATE + 23, 1499.97, 120.00,1619.97, 1619.97,'paid',    'QA seed invoice'),
  (9006, 9003, 'INV-QA-US-002', 9012, CURRENT_DATE - 2,  CURRENT_DATE + 28, 849.95,  68.00, 917.95,  0.00,   'unpaid',  'QA seed invoice'),
  -- EU tenant
  (9007, 9004, 'INV-QA-EU-001', 9016, CURRENT_DATE - 12, CURRENT_DATE + 18, 3175.00, 603.25,3778.25, 3778.25,'paid',    'QA seed invoice'),
  (9008, 9004, 'INV-QA-EU-002', 9017, CURRENT_DATE - 4,  CURRENT_DATE + 26, 7250.00, 1377.50,8627.50,0.00,   'unpaid',  'QA seed invoice')
ON CONFLICT (id) DO UPDATE SET invoice_number = EXCLUDED.invoice_number;

COMMIT;

-- Verify
SELECT t.name, t.currency_code, t.tax_regime,
       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS users,
       (SELECT COUNT(*) FROM customers c WHERE c.tenant_id = t.id) AS customers,
       (SELECT COUNT(*) FROM products p WHERE p.tenant_id = t.id) AS products
FROM tenants t WHERE t.id >= 9001 ORDER BY t.id;
