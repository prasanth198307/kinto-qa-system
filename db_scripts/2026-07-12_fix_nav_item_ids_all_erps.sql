-- Fix nav item ID mismatches and missing entries in subscription_plans.allowed_nav_items
-- Root cause: nav item IDs in App.tsx don't match what's stored in DB for many ERPs

-- Helper: append new items to allowed_nav_items array for plans that already have the ERP module

-- HEALTHCARE: add abdm, emr, tpa-claims
UPDATE subscription_plans
SET allowed_nav_items = array(
  SELECT DISTINCT unnest(allowed_nav_items || ARRAY[
    'healthcare/abdm', 'healthcare/emr', 'healthcare/tpa-claims'
  ])
)
WHERE 'healthcare' = ANY(allowed_nav_items);

-- HOTEL: add channel-manager, revenue-management, banquet
UPDATE subscription_plans
SET allowed_nav_items = array(
  SELECT DISTINCT unnest(allowed_nav_items || ARRAY[
    'hotel/channel-manager', 'hotel/revenue-management', 'hotel/banquet'
  ])
)
WHERE 'hotel' = ANY(allowed_nav_items);

-- NGO: add 80g-bulk, donor-admin
UPDATE subscription_plans
SET allowed_nav_items = array(
  SELECT DISTINCT unnest(allowed_nav_items || ARRAY[
    'ngo/80g-bulk', 'ngo/donor-admin', 'ngo/funds'
  ])
)
WHERE 'ngo' = ANY(allowed_nav_items);

-- NIDHI: add loan-sanction, pdc-tracking, rbi-returns, mobile-collection, daily-collection
UPDATE subscription_plans
SET allowed_nav_items = array(
  SELECT DISTINCT unnest(allowed_nav_items || ARRAY[
    'nidhi/loan-sanction', 'nidhi/pdc-tracking', 'nidhi/rbi-returns',
    'nidhi/mobile-collection', 'nidhi/daily-collection', 'nidhi/interest-rates',
    'nidhi/compliance'
  ])
)
WHERE 'nidhi' = ANY(allowed_nav_items);

-- CRM: add crm/customer-360 (hyphen version, DB has customer360 without hyphen)
UPDATE subscription_plans
SET allowed_nav_items = array(
  SELECT DISTINCT unnest(allowed_nav_items || ARRAY[
    'crm/customer-360', 'crm/lead-scoring', 'crm/drip-campaigns', 'crm/telephony'
  ])
)
WHERE 'crm' = ANY(allowed_nav_items) OR 'crm-leads' = ANY(allowed_nav_items);

-- ECOMMERCE: add warehouses
UPDATE subscription_plans
SET allowed_nav_items = array(
  SELECT DISTINCT unnest(allowed_nav_items || ARRAY[
    'ecommerce/warehouses'
  ])
)
WHERE 'ecommerce' = ANY(allowed_nav_items);

-- EDUCATION: add nep-compliance, certificates
UPDATE subscription_plans
SET allowed_nav_items = array(
  SELECT DISTINCT unnest(allowed_nav_items || ARRAY[
    'education/nep-compliance', 'education/certificates'
  ])
)
WHERE 'education' = ANY(allowed_nav_items);

-- PHARMACY: add prescriptions, narcotics-register, e-invoice
UPDATE subscription_plans
SET allowed_nav_items = array(
  SELECT DISTINCT unnest(allowed_nav_items || ARRAY[
    'pharmacy/prescriptions', 'pharmacy/narcotics-register', 'pharmacy/e-invoice'
  ])
)
WHERE 'pharmacy' = ANY(allowed_nav_items);

-- AGRICULTURE: add mandi-prices (nav uses hyphen, DB has 'mandi' without -prices)
UPDATE subscription_plans
SET allowed_nav_items = array(
  SELECT DISTINCT unnest(allowed_nav_items || ARRAY[
    'agriculture/mandi-prices', 'agriculture/pmfby'
  ])
)
WHERE 'agriculture' = ANY(allowed_nav_items);

-- LOGISTICS: add all missing screens
UPDATE subscription_plans
SET allowed_nav_items = array(
  SELECT DISTINCT unnest(allowed_nav_items || ARRAY[
    'logistics/fleet', 'logistics/trips', 'logistics/consignments', 'logistics/drivers',
    'logistics/fuel', 'logistics/epod', 'logistics/freight', 'logistics/gps',
    'logistics/live-gps', 'logistics/documents', 'logistics/reports',
    'logistics/route-optimization', 'logistics/eway-bill'
  ])
)
WHERE 'logistics' = ANY(allowed_nav_items);

-- PROJECTS & FIXED ASSETS: add to all plans
UPDATE subscription_plans
SET allowed_nav_items = array(
  SELECT DISTINCT unnest(allowed_nav_items || ARRAY[
    'projects', 'fixed-assets'
  ])
)
WHERE array_length(allowed_nav_items, 1) > 0;

-- GOLD ERP: ensure gold screens are present
UPDATE subscription_plans
SET allowed_nav_items = array(
  SELECT DISTINCT unnest(allowed_nav_items || ARRAY[
    'gold/rates', 'gold/purchases', 'gold/sales', 'gold/stock',
    'gold/ornaments', 'gold/schemes', 'gold/reports'
  ])
)
WHERE 'gold' = ANY(allowed_nav_items);

-- Verify counts
SELECT name, array_length(allowed_nav_items, 1) as nav_item_count
FROM subscription_plans
ORDER BY name;
