-- All-Plan Tenant Seed
-- Creates 51 test tenants (17 verticals × 3 tiers) + one per-tier generic.
-- Each tenant gets one admin user (password: Test@1234).
-- Run: psql $DATABASE_URL -f tests/seed/all-plan-tenants.sql
-- Tenant IDs: 9101–9151  User IDs via UUID so no collision.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- TENANTS (id, name, slug, plan, status, country, currency, tax_regime, default_locale)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO tenants (id, name, slug, plan, status, country, currency, tax_regime, default_locale)
VALUES
  -- Restaurant
  (9101, 'QA Restaurant Starter',        'qa-rst-s',  'restaurant_starter',       'active', 'India',  'INR', 'gst', 'en'),
  (9102, 'QA Restaurant Professional',   'qa-rst-p',  'restaurant_professional',  'active', 'India',  'INR', 'gst', 'en'),
  (9103, 'QA Restaurant Enterprise',     'qa-rst-e',  'restaurant_enterprise',    'active', 'India',  'INR', 'gst', 'en'),
  -- Hotel
  (9104, 'QA Hotel Starter',             'qa-htl-s',  'hotel_starter',            'active', 'India',  'INR', 'gst', 'en'),
  (9105, 'QA Hotel Professional',        'qa-htl-p',  'hotel_professional',       'active', 'India',  'INR', 'gst', 'en'),
  (9106, 'QA Hotel Enterprise',          'qa-htl-e',  'hotel_enterprise',         'active', 'India',  'INR', 'gst', 'en'),
  -- Healthcare
  (9107, 'QA Healthcare Starter',        'qa-hlt-s',  'healthcare_starter',       'active', 'India',  'INR', 'gst', 'en'),
  (9108, 'QA Healthcare Professional',   'qa-hlt-p',  'healthcare_professional',  'active', 'India',  'INR', 'gst', 'en'),
  (9109, 'QA Healthcare Enterprise',     'qa-hlt-e',  'healthcare_enterprise',    'active', 'India',  'INR', 'gst', 'en'),
  -- Pharmacy
  (9110, 'QA Pharmacy Starter',          'qa-phm-s',  'pharmacy_starter',         'active', 'India',  'INR', 'gst', 'en'),
  (9111, 'QA Pharmacy Professional',     'qa-phm-p',  'pharmacy_professional',    'active', 'India',  'INR', 'gst', 'en'),
  (9112, 'QA Pharmacy Enterprise',       'qa-phm-e',  'pharmacy_enterprise',      'active', 'India',  'INR', 'gst', 'en'),
  -- NGO
  (9113, 'QA NGO Starter',               'qa-ngo-s',  'ngo_starter',              'active', 'India',  'INR', 'gst', 'en'),
  (9114, 'QA NGO Professional',          'qa-ngo-p',  'ngo_professional',         'active', 'India',  'INR', 'gst', 'en'),
  (9115, 'QA NGO Enterprise',            'qa-ngo-e',  'ngo_enterprise',           'active', 'India',  'INR', 'gst', 'en'),
  -- Nidhi
  (9116, 'QA Nidhi Starter',             'qa-ndh-s',  'nidhi_starter',            'active', 'India',  'INR', 'gst', 'en'),
  (9117, 'QA Nidhi Professional',        'qa-ndh-p',  'nidhi_professional',       'active', 'India',  'INR', 'gst', 'en'),
  (9118, 'QA Nidhi Enterprise',          'qa-ndh-e',  'nidhi_enterprise',         'active', 'India',  'INR', 'gst', 'en'),
  -- CRM
  (9119, 'QA CRM Starter',               'qa-crm-s',  'crm_starter',              'active', 'India',  'INR', 'gst', 'en'),
  (9120, 'QA CRM Professional',          'qa-crm-p',  'crm_professional',         'active', 'India',  'INR', 'gst', 'en'),
  (9121, 'QA CRM Enterprise',            'qa-crm-e',  'crm_enterprise',           'active', 'India',  'INR', 'gst', 'en'),
  -- Logistics
  (9122, 'QA Logistics Starter',         'qa-lgx-s',  'logistics_starter',        'active', 'India',  'INR', 'gst', 'en'),
  (9123, 'QA Logistics Professional',    'qa-lgx-p',  'logistics_professional',   'active', 'India',  'INR', 'gst', 'en'),
  (9124, 'QA Logistics Enterprise',      'qa-lgx-e',  'logistics_enterprise',     'active', 'India',  'INR', 'gst', 'en'),
  -- Real Estate
  (9125, 'QA Real Estate Starter',       'qa-res-s',  'real_estate_starter',      'active', 'India',  'INR', 'gst', 'en'),
  (9126, 'QA Real Estate Professional',  'qa-res-p',  'real_estate_professional', 'active', 'India',  'INR', 'gst', 'en'),
  (9127, 'QA Real Estate Enterprise',    'qa-res-e',  'real_estate_enterprise',   'active', 'India',  'INR', 'gst', 'en'),
  -- Agriculture
  (9128, 'QA Agriculture Starter',       'qa-agr-s',  'agriculture_starter',      'active', 'India',  'INR', 'gst', 'en'),
  (9129, 'QA Agriculture Professional',  'qa-agr-p',  'agriculture_professional', 'active', 'India',  'INR', 'gst', 'en'),
  (9130, 'QA Agriculture Enterprise',    'qa-agr-e',  'agriculture_enterprise',   'active', 'India',  'INR', 'gst', 'en'),
  -- Education
  (9131, 'QA Education Starter',         'qa-edu-s',  'education_starter',        'active', 'India',  'INR', 'gst', 'en'),
  (9132, 'QA Education Professional',    'qa-edu-p',  'education_professional',   'active', 'India',  'INR', 'gst', 'en'),
  (9133, 'QA Education Enterprise',      'qa-edu-e',  'education_enterprise',     'active', 'India',  'INR', 'gst', 'en'),
  -- Gold ERP
  (9134, 'QA Gold ERP Starter',          'qa-gld-s',  'gold_starter',             'active', 'India',  'INR', 'gst', 'en'),
  (9135, 'QA Gold ERP Professional',     'qa-gld-p',  'gold_professional',        'active', 'India',  'INR', 'gst', 'en'),
  (9136, 'QA Gold ERP Enterprise',       'qa-gld-e',  'gold_enterprise',          'active', 'India',  'INR', 'gst', 'en'),
  -- Retail / POS
  (9137, 'QA POS Starter',               'qa-pos-s',  'pos_starter',              'active', 'United States', 'USD', 'sales_tax', 'en'),
  (9138, 'QA POS Professional',          'qa-pos-p',  'pos_professional',         'active', 'United States', 'USD', 'sales_tax', 'en'),
  (9139, 'QA POS Enterprise',            'qa-pos-e',  'pos_enterprise',           'active', 'United States', 'USD', 'sales_tax', 'en'),
  -- Manufacturing
  (9140, 'QA Manufacturing Starter',     'qa-mfg-s',  'manufacturing_starter',    'active', 'India',  'INR', 'gst', 'en'),
  (9141, 'QA Manufacturing Professional','qa-mfg-p',  'manufacturing_professional','active', 'India', 'INR', 'gst', 'en'),
  (9142, 'QA Manufacturing Enterprise',  'qa-mfg-e',  'manufacturing_enterprise', 'active', 'India',  'INR', 'gst', 'en'),
  -- HR & Payroll
  (9143, 'QA HR Starter',                'qa-hr-s',   'hr_starter',               'active', 'India',  'INR', 'gst', 'en'),
  (9144, 'QA HR Professional',           'qa-hr-p',   'hr_professional',          'active', 'India',  'INR', 'gst', 'en'),
  (9145, 'QA HR Enterprise',             'qa-hr-e',   'hr_enterprise',            'active', 'India',  'INR', 'gst', 'en'),
  -- E-Commerce
  (9146, 'QA Ecommerce Starter',         'qa-ecom-s', 'ecommerce_starter',        'active', 'India',  'INR', 'gst', 'en'),
  (9147, 'QA Ecommerce Professional',    'qa-ecom-p', 'ecommerce_professional',   'active', 'India',  'INR', 'gst', 'en'),
  (9148, 'QA Ecommerce Enterprise',      'qa-ecom-e', 'ecommerce_enterprise',     'active', 'India',  'INR', 'gst', 'en'),
  -- Generic Finance / Trading (basic / professional / enterprise)
  (9149, 'QA Finance Basic',             'qa-fin-s',  'basic',                    'active', 'India',  'INR', 'gst', 'en'),
  (9150, 'QA Finance Professional',      'qa-fin-p',  'professional',             'active', 'India',  'INR', 'gst', 'en'),
  (9151, 'QA Finance Enterprise',        'qa-fin-e',  'enterprise',               'active', 'India',  'INR', 'gst', 'en')
ON CONFLICT (id) DO UPDATE SET
  plan   = EXCLUDED.plan,
  status = EXCLUDED.status;

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN USERS  (password: Test@1234)
-- bcrypt hash: $2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO users (id, username, password, email, first_name, last_name, tenant_id, record_status)
VALUES
  (gen_random_uuid(), 'qa_rst_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-rst-s@test.local', 'QA', 'Admin', 9101, 1),
  (gen_random_uuid(), 'qa_rst_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-rst-p@test.local', 'QA', 'Admin', 9102, 1),
  (gen_random_uuid(), 'qa_rst_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-rst-e@test.local', 'QA', 'Admin', 9103, 1),
  (gen_random_uuid(), 'qa_htl_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-htl-s@test.local', 'QA', 'Admin', 9104, 1),
  (gen_random_uuid(), 'qa_htl_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-htl-p@test.local', 'QA', 'Admin', 9105, 1),
  (gen_random_uuid(), 'qa_htl_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-htl-e@test.local', 'QA', 'Admin', 9106, 1),
  (gen_random_uuid(), 'qa_hlt_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-hlt-s@test.local', 'QA', 'Admin', 9107, 1),
  (gen_random_uuid(), 'qa_hlt_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-hlt-p@test.local', 'QA', 'Admin', 9108, 1),
  (gen_random_uuid(), 'qa_hlt_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-hlt-e@test.local', 'QA', 'Admin', 9109, 1),
  (gen_random_uuid(), 'qa_phm_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-phm-s@test.local', 'QA', 'Admin', 9110, 1),
  (gen_random_uuid(), 'qa_phm_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-phm-p@test.local', 'QA', 'Admin', 9111, 1),
  (gen_random_uuid(), 'qa_phm_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-phm-e@test.local', 'QA', 'Admin', 9112, 1),
  (gen_random_uuid(), 'qa_ngo_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-ngo-s@test.local', 'QA', 'Admin', 9113, 1),
  (gen_random_uuid(), 'qa_ngo_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-ngo-p@test.local', 'QA', 'Admin', 9114, 1),
  (gen_random_uuid(), 'qa_ngo_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-ngo-e@test.local', 'QA', 'Admin', 9115, 1),
  (gen_random_uuid(), 'qa_ndh_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-ndh-s@test.local', 'QA', 'Admin', 9116, 1),
  (gen_random_uuid(), 'qa_ndh_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-ndh-p@test.local', 'QA', 'Admin', 9117, 1),
  (gen_random_uuid(), 'qa_ndh_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-ndh-e@test.local', 'QA', 'Admin', 9118, 1),
  (gen_random_uuid(), 'qa_crm_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-crm-s@test.local', 'QA', 'Admin', 9119, 1),
  (gen_random_uuid(), 'qa_crm_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-crm-p@test.local', 'QA', 'Admin', 9120, 1),
  (gen_random_uuid(), 'qa_crm_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-crm-e@test.local', 'QA', 'Admin', 9121, 1),
  (gen_random_uuid(), 'qa_lgx_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-lgx-s@test.local', 'QA', 'Admin', 9122, 1),
  (gen_random_uuid(), 'qa_lgx_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-lgx-p@test.local', 'QA', 'Admin', 9123, 1),
  (gen_random_uuid(), 'qa_lgx_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-lgx-e@test.local', 'QA', 'Admin', 9124, 1),
  (gen_random_uuid(), 'qa_res_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-res-s@test.local', 'QA', 'Admin', 9125, 1),
  (gen_random_uuid(), 'qa_res_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-res-p@test.local', 'QA', 'Admin', 9126, 1),
  (gen_random_uuid(), 'qa_res_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-res-e@test.local', 'QA', 'Admin', 9127, 1),
  (gen_random_uuid(), 'qa_agr_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-agr-s@test.local', 'QA', 'Admin', 9128, 1),
  (gen_random_uuid(), 'qa_agr_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-agr-p@test.local', 'QA', 'Admin', 9129, 1),
  (gen_random_uuid(), 'qa_agr_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-agr-e@test.local', 'QA', 'Admin', 9130, 1),
  (gen_random_uuid(), 'qa_edu_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-edu-s@test.local', 'QA', 'Admin', 9131, 1),
  (gen_random_uuid(), 'qa_edu_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-edu-p@test.local', 'QA', 'Admin', 9132, 1),
  (gen_random_uuid(), 'qa_edu_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-edu-e@test.local', 'QA', 'Admin', 9133, 1),
  (gen_random_uuid(), 'qa_gld_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-gld-s@test.local', 'QA', 'Admin', 9134, 1),
  (gen_random_uuid(), 'qa_gld_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-gld-p@test.local', 'QA', 'Admin', 9135, 1),
  (gen_random_uuid(), 'qa_gld_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-gld-e@test.local', 'QA', 'Admin', 9136, 1),
  (gen_random_uuid(), 'qa_pos_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-pos-s@test.local', 'QA', 'Admin', 9137, 1),
  (gen_random_uuid(), 'qa_pos_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-pos-p@test.local', 'QA', 'Admin', 9138, 1),
  (gen_random_uuid(), 'qa_pos_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-pos-e@test.local', 'QA', 'Admin', 9139, 1),
  (gen_random_uuid(), 'qa_mfg_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-mfg-s@test.local', 'QA', 'Admin', 9140, 1),
  (gen_random_uuid(), 'qa_mfg_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-mfg-p@test.local', 'QA', 'Admin', 9141, 1),
  (gen_random_uuid(), 'qa_mfg_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-mfg-e@test.local', 'QA', 'Admin', 9142, 1),
  (gen_random_uuid(), 'qa_hr_s_admin',   '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-hr-s@test.local',  'QA', 'Admin', 9143, 1),
  (gen_random_uuid(), 'qa_hr_p_admin',   '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-hr-p@test.local',  'QA', 'Admin', 9144, 1),
  (gen_random_uuid(), 'qa_hr_e_admin',   '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-hr-e@test.local',  'QA', 'Admin', 9145, 1),
  (gen_random_uuid(), 'qa_ecom_s_admin', '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-ecom-s@test.local','QA', 'Admin', 9146, 1),
  (gen_random_uuid(), 'qa_ecom_p_admin', '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-ecom-p@test.local','QA', 'Admin', 9147, 1),
  (gen_random_uuid(), 'qa_ecom_e_admin', '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-ecom-e@test.local','QA', 'Admin', 9148, 1),
  (gen_random_uuid(), 'qa_fin_s_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-fin-s@test.local', 'QA', 'Admin', 9149, 1),
  (gen_random_uuid(), 'qa_fin_p_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-fin-p@test.local', 'QA', 'Admin', 9150, 1),
  (gen_random_uuid(), 'qa_fin_e_admin',  '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WqCFiSP8kRuDJJtQ7I.6', 'qa-fin-e@test.local', 'QA', 'Admin', 9151, 1)
ON CONFLICT (username) DO NOTHING;

COMMIT;

-- After running this seed, also call the permissions seeder for each tenant.
-- From the app server: POST /api/admin/seed-permissions with tenant IDs 9101–9151
-- or run: npx tsx server/seed-permissions.ts 9101 9151
