-- =============================================================================
-- QA SEED FIX: Create all missing tenants, roles, and users for test suite
-- Fixes schema mismatches from original seed (name→first_name, is_active→record_status)
-- Uses ON CONFLICT DO NOTHING throughout — safe to re-run
-- =============================================================================

-- Password hash for Test@1234
-- $2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.

-- =============================================================================
-- STEP 1: Create missing tenants
-- =============================================================================
BEGIN;

-- Restaurant regional (9022–9026)
INSERT INTO tenants (id, name, slug, plan, currency, currency_code, tax_regime, country_code, status)
VALUES
  (9022,'QA Restaurant UAE','qa-rst-ae','restaurant_enterprise','AED','AED','vat','AE','active'),
  (9023,'QA Restaurant USA','qa-rst-us','restaurant_enterprise','USD','USD','sales_tax','US','active'),
  (9024,'QA Restaurant EU','qa-rst-eu','restaurant_enterprise','EUR','EUR','vat','DE','active'),
  (9025,'QA Restaurant SG','qa-rst-sg','restaurant_enterprise','SGD','SGD','gst','SG','active'),
  (9026,'QA Restaurant AU','qa-rst-au','restaurant_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;

-- Hotel role-workflow tenants (India, new ID range)
INSERT INTO tenants (id, name, slug, plan, currency, currency_code, tax_regime, country_code, status)
VALUES
  (9100,'QA Hotel Enterprise India','qa-htl-e','hotel_enterprise','INR','INR','gst','IN','active'),
  (9160,'QA Hotel UAE','qa-htl-ae','hotel_enterprise','AED','AED','vat','AE','active'),
  (9161,'QA Hotel USA','qa-htl-us','hotel_enterprise','USD','USD','sales_tax','US','active'),
  (9162,'QA Hotel EU','qa-htl-eu','hotel_enterprise','EUR','EUR','vat','DE','active'),
  (9163,'QA Hotel SG','qa-htl-sg','hotel_enterprise','SGD','SGD','gst','SG','active'),
  (9164,'QA Hotel AU','qa-htl-au','hotel_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;

-- Hotel starter/professional in free slots
INSERT INTO tenants (id, name, slug, plan, currency, currency_code, tax_regime, country_code, status)
VALUES
  (9165,'QA Hotel Starter India','qa-htl-s','hotel_starter','INR','INR','gst','IN','active'),
  (9166,'QA Hotel Professional India','qa-htl-p','hotel_professional','INR','INR','gst','IN','active')
ON CONFLICT (id) DO NOTHING;

-- NGO role-workflow + regional (9400–9426)
INSERT INTO tenants (id, name, slug, plan, currency, currency_code, tax_regime, country_code, status)
VALUES
  (9400,'QA NGO Enterprise India','qa-ngo-e2','ngo_enterprise','INR','INR','gst','IN','active'),
  (9420,'QA NGO Starter India','qa-ngo-s2','ngo_starter','INR','INR','gst','IN','active'),
  (9421,'QA NGO Professional India','qa-ngo-p2','ngo_professional','INR','INR','gst','IN','active'),
  (9422,'QA NGO UAE','qa-ngo-ae','ngo_enterprise','AED','AED','vat','AE','active'),
  (9423,'QA NGO USA','qa-ngo-us','ngo_enterprise','USD','USD','sales_tax','US','active'),
  (9424,'QA NGO EU','qa-ngo-eu','ngo_enterprise','EUR','EUR','vat','DE','active'),
  (9425,'QA NGO SG','qa-ngo-sg','ngo_enterprise','SGD','SGD','gst','SG','active'),
  (9426,'QA NGO AU','qa-ngo-au','ngo_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;

-- CRM role-workflow + regional (9600–9626)
INSERT INTO tenants (id, name, slug, plan, currency, currency_code, tax_regime, country_code, status)
VALUES
  (9600,'QA CRM Enterprise India','qa-crm-e2','crm_enterprise','INR','INR','gst','IN','active'),
  (9620,'QA CRM Starter India','qa-crm-s2','crm_starter','INR','INR','gst','IN','active'),
  (9621,'QA CRM Professional India','qa-crm-p2','crm_professional','INR','INR','gst','IN','active'),
  (9622,'QA CRM UAE','qa-crm-ae','crm_enterprise','AED','AED','vat','AE','active'),
  (9623,'QA CRM USA','qa-crm-us','crm_enterprise','USD','USD','sales_tax','US','active'),
  (9624,'QA CRM EU','qa-crm-eu','crm_enterprise','EUR','EUR','vat','DE','active'),
  (9625,'QA CRM SG','qa-crm-sg','crm_enterprise','SGD','SGD','gst','SG','active'),
  (9626,'QA CRM AU','qa-crm-au','crm_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;

-- Agriculture role-workflow + regional (9900–9926)
INSERT INTO tenants (id, name, slug, plan, currency, currency_code, tax_regime, country_code, status)
VALUES
  (9900,'QA Agriculture Enterprise India','qa-agr-e2','agriculture_enterprise','INR','INR','gst','IN','active'),
  (9920,'QA Agriculture Starter India','qa-agr-s2','agriculture_starter','INR','INR','gst','IN','active'),
  (9921,'QA Agriculture Professional India','qa-agr-p2','agriculture_professional','INR','INR','gst','IN','active'),
  (9922,'QA Agriculture UAE','qa-agr-ae','agriculture_enterprise','AED','AED','vat','AE','active'),
  (9923,'QA Agriculture USA','qa-agr-us','agriculture_enterprise','USD','USD','sales_tax','US','active'),
  (9924,'QA Agriculture EU','qa-agr-eu','agriculture_enterprise','EUR','EUR','vat','DE','active'),
  (9925,'QA Agriculture SG','qa-agr-sg','agriculture_enterprise','SGD','SGD','gst','SG','active'),
  (9926,'QA Agriculture AU','qa-agr-au','agriculture_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;

-- Education role-workflow + regional (9950–9976)
INSERT INTO tenants (id, name, slug, plan, currency, currency_code, tax_regime, country_code, status)
VALUES
  (9950,'QA Education Enterprise India','qa-edu-e2','education_enterprise','INR','INR','gst','IN','active'),
  (9970,'QA Education Starter India','qa-edu-s2','education_starter','INR','INR','gst','IN','active'),
  (9971,'QA Education Professional India','qa-edu-p2','education_professional','INR','INR','gst','IN','active'),
  (9972,'QA Education UAE','qa-edu-ae','education_enterprise','AED','AED','vat','AE','active'),
  (9973,'QA Education USA','qa-edu-us','education_enterprise','USD','USD','sales_tax','US','active'),
  (9974,'QA Education EU','qa-edu-eu','education_enterprise','EUR','EUR','vat','DE','active'),
  (9975,'QA Education SG','qa-edu-sg','education_enterprise','SGD','SGD','gst','SG','active'),
  (9976,'QA Education AU','qa-edu-au','education_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;

-- Retail/POS role-workflow + regional (8100–8126)
INSERT INTO tenants (id, name, slug, plan, currency, currency_code, tax_regime, country_code, status)
VALUES
  (8100,'QA Retail Enterprise India','qa-rtl-e','pos_enterprise','INR','INR','gst','IN','active'),
  (8120,'QA Retail Starter India','qa-rtl-s','pos_starter','INR','INR','gst','IN','active'),
  (8121,'QA Retail Professional India','qa-rtl-p','pos_professional','INR','INR','gst','IN','active'),
  (8122,'QA Retail UAE','qa-rtl-ae','pos_enterprise','AED','AED','vat','AE','active'),
  (8123,'QA Retail USA','qa-rtl-us','pos_enterprise','USD','USD','sales_tax','US','active'),
  (8124,'QA Retail EU','qa-rtl-eu','pos_enterprise','EUR','EUR','vat','DE','active'),
  (8125,'QA Retail SG','qa-rtl-sg','pos_enterprise','SGD','SGD','gst','SG','active'),
  (8126,'QA Retail AU','qa-rtl-au','pos_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;

-- Manufacturing role-workflow + regional (8200–8226)
INSERT INTO tenants (id, name, slug, plan, currency, currency_code, tax_regime, country_code, status)
VALUES
  (8200,'QA Manufacturing Enterprise India','qa-mfg-e','manufacturing_enterprise','INR','INR','gst','IN','active'),
  (8220,'QA Manufacturing Starter India','qa-mfg-s','manufacturing_starter','INR','INR','gst','IN','active'),
  (8221,'QA Manufacturing Professional India','qa-mfg-p','manufacturing_professional','INR','INR','gst','IN','active'),
  (8222,'QA Manufacturing UAE','qa-mfg-ae','manufacturing_enterprise','AED','AED','vat','AE','active'),
  (8223,'QA Manufacturing USA','qa-mfg-us','manufacturing_enterprise','USD','USD','sales_tax','US','active'),
  (8224,'QA Manufacturing EU','qa-mfg-eu','manufacturing_enterprise','EUR','EUR','vat','DE','active'),
  (8225,'QA Manufacturing SG','qa-mfg-sg','manufacturing_enterprise','SGD','SGD','gst','SG','active'),
  (8226,'QA Manufacturing AU','qa-mfg-au','manufacturing_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;

-- Finance role-workflow + regional (8300–8326)
INSERT INTO tenants (id, name, slug, plan, currency, currency_code, tax_regime, country_code, status)
VALUES
  (8300,'QA Finance Enterprise India','qa-fin-e','enterprise','INR','INR','gst','IN','active'),
  (8320,'QA Finance Starter India','qa-fin-s','basic','INR','INR','gst','IN','active'),
  (8321,'QA Finance Professional India','qa-fin-p','professional','INR','INR','gst','IN','active'),
  (8322,'QA Finance UAE','qa-fin-ae','enterprise','AED','AED','vat','AE','active'),
  (8323,'QA Finance USA','qa-fin-us','enterprise','USD','USD','sales_tax','US','active'),
  (8324,'QA Finance EU','qa-fin-eu','enterprise','EUR','EUR','vat','DE','active'),
  (8325,'QA Finance SG','qa-fin-sg','enterprise','SGD','SGD','gst','SG','active'),
  (8326,'QA Finance AU','qa-fin-au','enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;

-- E-Commerce role-workflow + regional (8400–8426)
INSERT INTO tenants (id, name, slug, plan, currency, currency_code, tax_regime, country_code, status)
VALUES
  (8400,'QA Ecommerce Enterprise India','qa-eco-e','ecommerce_enterprise','INR','INR','gst','IN','active'),
  (8420,'QA Ecommerce Starter India','qa-eco-s','ecommerce_starter','INR','INR','gst','IN','active'),
  (8421,'QA Ecommerce Professional India','qa-eco-p','ecommerce_professional','INR','INR','gst','IN','active'),
  (8422,'QA Ecommerce UAE','qa-eco-ae','ecommerce_enterprise','AED','AED','vat','AE','active'),
  (8423,'QA Ecommerce USA','qa-eco-us','ecommerce_enterprise','USD','USD','sales_tax','US','active'),
  (8424,'QA Ecommerce EU','qa-eco-eu','ecommerce_enterprise','EUR','EUR','vat','DE','active'),
  (8425,'QA Ecommerce SG','qa-eco-sg','ecommerce_enterprise','SGD','SGD','gst','SG','active'),
  (8426,'QA Ecommerce AU','qa-eco-au','ecommerce_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;

-- HR/Payroll role-workflow + regional (8500–8526)
INSERT INTO tenants (id, name, slug, plan, currency, currency_code, tax_regime, country_code, status)
VALUES
  (8500,'QA HR Enterprise India','qa-hr-e','hr_enterprise','INR','INR','gst','IN','active'),
  (8520,'QA HR Starter India','qa-hr-s','hr_starter','INR','INR','gst','IN','active'),
  (8521,'QA HR Professional India','qa-hr-p','hr_professional','INR','INR','gst','IN','active'),
  (8522,'QA HR UAE','qa-hr-ae','hr_enterprise','AED','AED','vat','AE','active'),
  (8523,'QA HR USA','qa-hr-us','hr_enterprise','USD','USD','sales_tax','US','active'),
  (8524,'QA HR EU','qa-hr-eu','hr_enterprise','EUR','EUR','vat','DE','active'),
  (8525,'QA HR SG','qa-hr-sg','hr_enterprise','SGD','SGD','gst','SG','active'),
  (8526,'QA HR AU','qa-hr-au','hr_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =============================================================================
-- STEP 2: Create 5 standard roles for every QA tenant that is missing roles
-- Using predictable IDs: qa-r-{tenantId}-{a|m|o|r|am}
-- =============================================================================
BEGIN;

DO $$
DECLARE
  tids INT[] := ARRAY[
    -- restaurant
    9001,9022,9023,9024,9025,9026,
    -- hotel
    9100,9106,9160,9161,9162,9163,9164,9165,9166,
    -- healthcare (+ existing tenants needing roles)
    9109,9200,9220,9221,9222,9223,9224,9225,9226,
    -- pharmacy
    9112,9300,9320,9321,9322,9323,9324,9325,9326,
    -- ngo
    9115,9400,9420,9421,9422,9423,9424,9425,9426,
    -- nidhi  (use existing enterprise/regional)
    9118,9520,9521,9522,9523,9524,9525,9526,
    -- crm
    9121,9600,9620,9621,9622,9623,9624,9625,9626,
    -- logistics
    9124,9700,9720,9721,9722,9723,9724,9725,9726,
    -- real estate
    9127,9800,9820,9821,9822,9823,9824,9825,9826,
    -- agriculture
    9130,9900,9920,9921,9922,9923,9924,9925,9926,
    -- education
    9133,9950,9970,9971,9972,9973,9974,9975,9976,
    -- gold
    8000,8020,8021,8022,8023,8024,8025,8026,
    -- retail
    8100,8120,8121,8122,8123,8124,8125,8126,
    -- manufacturing
    8200,8220,8221,8222,8223,8224,8225,8226,
    9142,
    -- finance
    8300,8320,8321,8322,8323,8324,8325,8326,
    9151,
    -- ecommerce
    8400,8420,8421,8422,8423,8424,8425,8426,
    9148,
    -- hr
    8500,8520,8521,8522,8523,8524,8525,8526,
    9145
  ];
  tid INT;
BEGIN
  FOREACH tid IN ARRAY tids LOOP
    INSERT INTO roles (id, name, description, tenant_id, record_status)
    VALUES
      ('qa-r-'||tid||'-a',  'admin',           'QA admin role',           tid, 1),
      ('qa-r-'||tid||'-m',  'manager',         'QA manager role',         tid, 1),
      ('qa-r-'||tid||'-o',  'operator',        'QA operator role',        tid, 1),
      ('qa-r-'||tid||'-r',  'reviewer',        'QA reviewer role',        tid, 1),
      ('qa-r-'||tid||'-am', 'accountsmanager', 'QA accountsmanager role', tid, 1)
    ON CONFLICT (name, tenant_id) DO NOTHING;
  END LOOP;
END $$;

COMMIT;

-- =============================================================================
-- STEP 3: Insert all users
-- Using correct columns: first_name, last_name, record_status (no name, no is_active)
-- =============================================================================
BEGIN;

DO $$
DECLARE
  pw TEXT := '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.';

  PROCEDURE ins(uname TEXT, tid INT, rolecode TEXT) LANGUAGE plpgsql AS $p$
  DECLARE
    rid TEXT := 'qa-r-'||tid||'-'||rolecode;
    rname TEXT;
  BEGIN
    rname := CASE rolecode
      WHEN 'a'  THEN 'admin'
      WHEN 'm'  THEN 'manager'
      WHEN 'o'  THEN 'operator'
      WHEN 'r'  THEN 'reviewer'
      WHEN 'am' THEN 'accountsmanager'
    END;
    INSERT INTO users (id, username, password, email, first_name, last_name, role_id, role, tenant_id, record_status)
    VALUES (
      'qa-u-'||uname,
      uname,
      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.',
      uname||'@qa.kinto',
      'QA', uname,
      rid,
      rname,
      tid,
      1
    )
    ON CONFLICT (username) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'User % skipped: %', uname, SQLERRM;
  END $p$;

BEGIN
  -- ── RESTAURANT enterprise (9001) ──────────────────────────────────────────
  CALL ins('qa_e_owner',   9001,'a');
  CALL ins('qa_e_manager', 9001,'m');
  CALL ins('qa_e_cashier', 9001,'o');
  CALL ins('qa_e_steward', 9001,'r');
  CALL ins('qa_e_chef',    9001,'r');
  CALL ins('qa_e_acct',    9001,'am');
  CALL ins('qa_e_hr',      9001,'o');
  CALL ins('qa_e_crm',     9001,'o');
  CALL ins('qa_e_sales',   9001,'o');
  CALL ins('qa_e_mis',     9001,'r');
  CALL ins('qa_e_wh',      9001,'o');
  CALL ins('qa_e_prod',    9001,'o');
  CALL ins('qa_e_assets',  9001,'o');

  -- Restaurant regional (9022–9026)
  CALL ins('qa_rst_ae_owner',    9022,'a');  CALL ins('qa_rst_ae_manager', 9022,'m');
  CALL ins('qa_rst_ae_cashier',  9022,'o');  CALL ins('qa_rst_ae_acct',    9022,'am');
  CALL ins('qa_rst_us_owner',    9023,'a');  CALL ins('qa_rst_us_manager', 9023,'m');
  CALL ins('qa_rst_us_cashier',  9023,'o');  CALL ins('qa_rst_us_acct',    9023,'am');
  CALL ins('qa_rst_eu_owner',    9024,'a');  CALL ins('qa_rst_eu_manager', 9024,'m');
  CALL ins('qa_rst_eu_cashier',  9024,'o');  CALL ins('qa_rst_eu_acct',    9024,'am');
  CALL ins('qa_rst_sg_owner',    9025,'a');  CALL ins('qa_rst_sg_manager', 9025,'m');
  CALL ins('qa_rst_sg_cashier',  9025,'o');  CALL ins('qa_rst_sg_acct',    9025,'am');
  CALL ins('qa_rst_au_owner',    9026,'a');  CALL ins('qa_rst_au_manager', 9026,'m');
  CALL ins('qa_rst_au_cashier',  9026,'o');  CALL ins('qa_rst_au_acct',    9026,'am');

  -- ── HOTEL enterprise (9100, mapped from 9106 plan) ──────────────────────
  CALL ins('qa_htl_owner',       9100,'a');
  CALL ins('qa_htl_manager',     9100,'m');
  CALL ins('qa_htl_receptionist',9100,'o');
  CALL ins('qa_htl_housekeeping',9100,'o');
  CALL ins('qa_htl_acct',        9100,'am');
  CALL ins('qa_htl_hr',          9100,'o');
  CALL ins('qa_htl_crm',         9100,'o');
  CALL ins('qa_htl_sales',       9100,'o');
  CALL ins('qa_htl_mis',         9100,'r');
  CALL ins('qa_htl_wh',          9100,'o');
  CALL ins('qa_htl_prod',        9100,'o');
  CALL ins('qa_htl_assets',      9100,'o');
  -- Hotel starter (9165)
  CALL ins('qa_htl_s_owner',     9165,'a'); CALL ins('qa_htl_s_manager',   9165,'m');
  CALL ins('qa_htl_s_front_desk',9165,'o'); CALL ins('qa_htl_s_billing',   9165,'am');
  -- Hotel professional (9166)
  CALL ins('qa_htl_p_owner',     9166,'a'); CALL ins('qa_htl_p_manager',   9166,'m');
  CALL ins('qa_htl_p_front_desk',9166,'o'); CALL ins('qa_htl_p_acct',      9166,'am');
  CALL ins('qa_htl_p_hr',        9166,'o'); CALL ins('qa_htl_p_crm',       9166,'o');
  CALL ins('qa_htl_p_mis',       9166,'r');
  -- Hotel regional (9160–9164)
  CALL ins('qa_htl_ae_owner',    9160,'a'); CALL ins('qa_htl_ae_mgr',         9160,'m');
  CALL ins('qa_htl_ae_receptionist',9160,'o'); CALL ins('qa_htl_ae_acct',     9160,'am');
  CALL ins('qa_htl_us_owner',    9161,'a'); CALL ins('qa_htl_us_mgr',         9161,'m');
  CALL ins('qa_htl_us_receptionist',9161,'o'); CALL ins('qa_htl_us_acct',     9161,'am');
  CALL ins('qa_htl_eu_owner',    9162,'a'); CALL ins('qa_htl_eu_mgr',         9162,'m');
  CALL ins('qa_htl_eu_receptionist',9162,'o'); CALL ins('qa_htl_eu_acct',     9162,'am');
  CALL ins('qa_htl_sg_owner',    9163,'a'); CALL ins('qa_htl_sg_mgr',         9163,'m');
  CALL ins('qa_htl_sg_receptionist',9163,'o'); CALL ins('qa_htl_sg_acct',     9163,'am');
  CALL ins('qa_htl_au_owner',    9164,'a'); CALL ins('qa_htl_au_mgr',         9164,'m');
  CALL ins('qa_htl_au_receptionist',9164,'o'); CALL ins('qa_htl_au_acct',     9164,'am');

  -- ── HEALTHCARE enterprise (9109 / 9200) ─────────────────────────────────
  CALL ins('qa_hc_owner',        9200,'a');
  CALL ins('qa_hc_doctor',       9200,'m');
  CALL ins('qa_hc_nurse',        9200,'o');
  CALL ins('qa_hc_receptionist', 9200,'o');
  CALL ins('qa_hc_acct',         9200,'am');
  CALL ins('qa_hc_hr',           9200,'o');
  CALL ins('qa_hc_crm',          9200,'o');
  CALL ins('qa_hc_sales',        9200,'o');
  CALL ins('qa_hc_mis',          9200,'r');
  CALL ins('qa_hc_wh',           9200,'o');
  CALL ins('qa_hc_prod',         9200,'o');
  CALL ins('qa_hc_assets',       9200,'o');
  -- HC starter (9220)
  CALL ins('qa_hc_s_owner',      9220,'a'); CALL ins('qa_hc_s_doctor',       9220,'m');
  CALL ins('qa_hc_s_receptionist',9220,'o'); CALL ins('qa_hc_s_billing',     9220,'am');
  -- HC professional (9221)
  CALL ins('qa_hc_p_owner',      9221,'a'); CALL ins('qa_hc_p_doctor',       9221,'m');
  CALL ins('qa_hc_p_receptionist',9221,'o'); CALL ins('qa_hc_p_acct',        9221,'am');
  CALL ins('qa_hc_p_hr',         9221,'o'); CALL ins('qa_hc_p_crm',          9221,'o');
  CALL ins('qa_hc_p_mis',        9221,'r');
  -- HC regional (9222–9226)
  CALL ins('qa_hc_ae_owner',     9222,'a'); CALL ins('qa_hc_ae_doctor',      9222,'m');
  CALL ins('qa_hc_ae_receptionist',9222,'o'); CALL ins('qa_hc_ae_acct',      9222,'am');
  CALL ins('qa_hc_us_owner',     9223,'a'); CALL ins('qa_hc_us_doctor',      9223,'m');
  CALL ins('qa_hc_us_receptionist',9223,'o'); CALL ins('qa_hc_us_acct',      9223,'am');
  CALL ins('qa_hc_eu_owner',     9224,'a'); CALL ins('qa_hc_eu_doctor',      9224,'m');
  CALL ins('qa_hc_eu_receptionist',9224,'o'); CALL ins('qa_hc_eu_acct',      9224,'am');
  CALL ins('qa_hc_sg_owner',     9225,'a'); CALL ins('qa_hc_sg_doctor',      9225,'m');
  CALL ins('qa_hc_sg_receptionist',9225,'o'); CALL ins('qa_hc_sg_acct',      9225,'am');
  CALL ins('qa_hc_au_owner',     9226,'a'); CALL ins('qa_hc_au_doctor',      9226,'m');
  CALL ins('qa_hc_au_receptionist',9226,'o'); CALL ins('qa_hc_au_acct',      9226,'am');

  -- ── PHARMACY enterprise (9112 / 9300) ───────────────────────────────────
  CALL ins('qa_ph_owner',        9300,'a');
  CALL ins('qa_ph_pharmacist',   9300,'m');
  CALL ins('qa_ph_cashier',      9300,'o');
  CALL ins('qa_ph_purchase',     9300,'o');
  CALL ins('qa_ph_acct',         9300,'am');
  CALL ins('qa_ph_hr',           9300,'o');
  CALL ins('qa_ph_crm',          9300,'o');
  CALL ins('qa_ph_sales',        9300,'o');
  CALL ins('qa_ph_mis',          9300,'r');
  CALL ins('qa_ph_wh',           9300,'o');
  CALL ins('qa_ph_prod',         9300,'o');
  CALL ins('qa_ph_assets',       9300,'o');
  -- PH starter (9320)
  CALL ins('qa_ph_s_owner',      9320,'a'); CALL ins('qa_ph_s_pharmacist',   9320,'m');
  CALL ins('qa_ph_s_cashier',    9320,'o'); CALL ins('qa_ph_s_billing',      9320,'am');
  -- PH professional (9321)
  CALL ins('qa_ph_p_owner',      9321,'a'); CALL ins('qa_ph_p_pharmacist',   9321,'m');
  CALL ins('qa_ph_p_cashier',    9321,'o'); CALL ins('qa_ph_p_acct',         9321,'am');
  CALL ins('qa_ph_p_hr',         9321,'o'); CALL ins('qa_ph_p_crm',          9321,'o');
  CALL ins('qa_ph_p_mis',        9321,'r');
  -- PH regional (9322–9326)
  CALL ins('qa_ph_ae_owner',     9322,'a'); CALL ins('qa_ph_ae_pharmacist',  9322,'m');
  CALL ins('qa_ph_ae_cashier',   9322,'o'); CALL ins('qa_ph_ae_acct',        9322,'am');
  CALL ins('qa_ph_us_owner',     9323,'a'); CALL ins('qa_ph_us_pharmacist',  9323,'m');
  CALL ins('qa_ph_us_cashier',   9323,'o'); CALL ins('qa_ph_us_acct',        9323,'am');
  CALL ins('qa_ph_eu_owner',     9324,'a'); CALL ins('qa_ph_eu_pharmacist',  9324,'m');
  CALL ins('qa_ph_eu_cashier',   9324,'o'); CALL ins('qa_ph_eu_acct',        9324,'am');
  CALL ins('qa_ph_sg_owner',     9325,'a'); CALL ins('qa_ph_sg_pharmacist',  9325,'m');
  CALL ins('qa_ph_sg_cashier',   9325,'o'); CALL ins('qa_ph_sg_acct',        9325,'am');
  CALL ins('qa_ph_au_owner',     9326,'a'); CALL ins('qa_ph_au_pharmacist',  9326,'m');
  CALL ins('qa_ph_au_cashier',   9326,'o'); CALL ins('qa_ph_au_acct',        9326,'am');

  -- ── NGO enterprise (9400) ───────────────────────────────────────────────
  CALL ins('qa_ngo_owner',       9400,'a');
  CALL ins('qa_ngo_manager',     9400,'m');
  CALL ins('qa_ngo_field_worker',9400,'o');
  CALL ins('qa_ngo_donor_mgr',   9400,'o');
  CALL ins('qa_ngo_acct',        9400,'am');
  CALL ins('qa_ngo_hr',          9400,'o');
  CALL ins('qa_ngo_crm',         9400,'o');
  CALL ins('qa_ngo_sales',       9400,'o');
  CALL ins('qa_ngo_mis',         9400,'r');
  CALL ins('qa_ngo_wh',          9400,'o');
  CALL ins('qa_ngo_prod',        9400,'o');
  CALL ins('qa_ngo_assets',      9400,'o');
  -- NGO starter (9420)
  CALL ins('qa_ngo_s_owner',     9420,'a'); CALL ins('qa_ngo_s_manager',     9420,'m');
  CALL ins('qa_ngo_s_field_worker',9420,'o');
  -- NGO professional (9421)
  CALL ins('qa_ngo_p_owner',     9421,'a'); CALL ins('qa_ngo_p_manager',     9421,'m');
  CALL ins('qa_ngo_p_acct',      9421,'am'); CALL ins('qa_ngo_p_hr',         9421,'o');
  CALL ins('qa_ngo_p_crm',       9421,'o');  CALL ins('qa_ngo_p_mis',        9421,'r');
  -- NGO regional (9422–9426)
  CALL ins('qa_ngo_ae_owner',    9422,'a'); CALL ins('qa_ngo_ae_manager',    9422,'m');
  CALL ins('qa_ngo_ae_field_worker',9422,'o'); CALL ins('qa_ngo_ae_acct',    9422,'am');
  CALL ins('qa_ngo_us_owner',    9423,'a'); CALL ins('qa_ngo_us_manager',    9423,'m');
  CALL ins('qa_ngo_us_field_worker',9423,'o'); CALL ins('qa_ngo_us_acct',    9423,'am');
  CALL ins('qa_ngo_eu_owner',    9424,'a'); CALL ins('qa_ngo_eu_manager',    9424,'m');
  CALL ins('qa_ngo_eu_field_worker',9424,'o'); CALL ins('qa_ngo_eu_acct',    9424,'am');
  CALL ins('qa_ngo_sg_owner',    9425,'a'); CALL ins('qa_ngo_sg_manager',    9425,'m');
  CALL ins('qa_ngo_sg_field_worker',9425,'o'); CALL ins('qa_ngo_sg_acct',    9425,'am');
  CALL ins('qa_ngo_au_owner',    9426,'a'); CALL ins('qa_ngo_au_manager',    9426,'m');
  CALL ins('qa_ngo_au_field_worker',9426,'o'); CALL ins('qa_ngo_au_acct',    9426,'am');

  -- ── NIDHI enterprise (9500) ─────────────────────────────────────────────
  CALL ins('qa_ndh_owner',       9500,'a');
  CALL ins('qa_ndh_manager',     9500,'m');
  CALL ins('qa_ndh_collector',   9500,'o');
  CALL ins('qa_ndh_loan_officer',9500,'o');
  CALL ins('qa_ndh_acct',        9500,'am');
  CALL ins('qa_ndh_hr',          9500,'o');
  CALL ins('qa_ndh_mis',         9500,'r');
  CALL ins('qa_ndh_audit',       9500,'r');
  -- Nidhi starter (9520)
  CALL ins('qa_ndh_s_owner',     9520,'a'); CALL ins('qa_ndh_s_manager',    9520,'m');
  CALL ins('qa_ndh_s_collector', 9520,'o');
  -- Nidhi professional (9521)
  CALL ins('qa_ndh_p_owner',     9521,'a'); CALL ins('qa_ndh_p_manager',    9521,'m');
  CALL ins('qa_ndh_p_collector', 9521,'o'); CALL ins('qa_ndh_p_acct',       9521,'am');
  CALL ins('qa_ndh_p_mis',       9521,'r');
  -- Nidhi regional (9522–9526) — add 3 more users each (already has 1)
  CALL ins('qa_ndh_ae_owner',    9522,'a'); CALL ins('qa_ndh_ae_manager',   9522,'m');
  CALL ins('qa_ndh_ae_collector',9522,'o'); CALL ins('qa_ndh_ae_acct',      9522,'am');
  CALL ins('qa_ndh_us_owner',    9523,'a'); CALL ins('qa_ndh_us_manager',   9523,'m');
  CALL ins('qa_ndh_us_collector',9523,'o'); CALL ins('qa_ndh_us_acct',      9523,'am');
  CALL ins('qa_ndh_eu_owner',    9524,'a'); CALL ins('qa_ndh_eu_manager',   9524,'m');
  CALL ins('qa_ndh_eu_collector',9524,'o'); CALL ins('qa_ndh_eu_acct',      9524,'am');
  CALL ins('qa_ndh_sg_owner',    9525,'a'); CALL ins('qa_ndh_sg_manager',   9525,'m');
  CALL ins('qa_ndh_sg_collector',9525,'o'); CALL ins('qa_ndh_sg_acct',      9525,'am');
  CALL ins('qa_ndh_au_owner',    9526,'a'); CALL ins('qa_ndh_au_manager',   9526,'m');
  CALL ins('qa_ndh_au_collector',9526,'o'); CALL ins('qa_ndh_au_acct',      9526,'am');

  -- ── CRM enterprise (9600) ───────────────────────────────────────────────
  CALL ins('qa_crm_owner',       9600,'a');
  CALL ins('qa_crm_manager',     9600,'m');
  CALL ins('qa_crm_sales_exec',  9600,'o');
  CALL ins('qa_crm_support',     9600,'o');
  CALL ins('qa_crm_acct',        9600,'am');
  CALL ins('qa_crm_hr',          9600,'o');
  CALL ins('qa_crm_mis',         9600,'r');
  CALL ins('qa_crm_mkt',         9600,'o');
  -- CRM starter (9620)
  CALL ins('qa_crm_s_owner',     9620,'a'); CALL ins('qa_crm_s_sales_exec', 9620,'o');
  CALL ins('qa_crm_s_support',   9620,'o');
  -- CRM professional (9621)
  CALL ins('qa_crm_p_owner',     9621,'a'); CALL ins('qa_crm_p_manager',    9621,'m');
  CALL ins('qa_crm_p_sales_exec',9621,'o'); CALL ins('qa_crm_p_acct',       9621,'am');
  CALL ins('qa_crm_p_mis',       9621,'r');
  -- CRM regional (9622–9626)
  CALL ins('qa_crm_ae_owner',    9622,'a'); CALL ins('qa_crm_ae_manager',   9622,'m');
  CALL ins('qa_crm_ae_sales_exec',9622,'o'); CALL ins('qa_crm_ae_acct',     9622,'am');
  CALL ins('qa_crm_us_owner',    9623,'a'); CALL ins('qa_crm_us_manager',   9623,'m');
  CALL ins('qa_crm_us_sales_exec',9623,'o'); CALL ins('qa_crm_us_acct',     9623,'am');
  CALL ins('qa_crm_eu_owner',    9624,'a'); CALL ins('qa_crm_eu_manager',   9624,'m');
  CALL ins('qa_crm_eu_sales_exec',9624,'o'); CALL ins('qa_crm_eu_acct',     9624,'am');
  CALL ins('qa_crm_sg_owner',    9625,'a'); CALL ins('qa_crm_sg_manager',   9625,'m');
  CALL ins('qa_crm_sg_sales_exec',9625,'o'); CALL ins('qa_crm_sg_acct',     9625,'am');
  CALL ins('qa_crm_au_owner',    9626,'a'); CALL ins('qa_crm_au_manager',   9626,'m');
  CALL ins('qa_crm_au_sales_exec',9626,'o'); CALL ins('qa_crm_au_acct',     9626,'am');

  -- ── LOGISTICS enterprise (9700) ─────────────────────────────────────────
  CALL ins('qa_lgs_owner',       9700,'a');
  CALL ins('qa_lgs_manager',     9700,'m');
  CALL ins('qa_lgs_dispatcher',  9700,'o');
  CALL ins('qa_lgs_driver',      9700,'o');
  CALL ins('qa_lgs_acct',        9700,'am');
  CALL ins('qa_lgs_hr',          9700,'o');
  CALL ins('qa_lgs_crm',         9700,'o');
  CALL ins('qa_lgs_sales',       9700,'o');
  CALL ins('qa_lgs_mis',         9700,'r');
  CALL ins('qa_lgs_wh',          9700,'o');
  CALL ins('qa_lgs_prod',        9700,'o');
  CALL ins('qa_lgs_assets',      9700,'o');
  -- Logistics starter (9720)
  CALL ins('qa_lgs_s_owner',     9720,'a'); CALL ins('qa_lgs_s_manager',    9720,'m');
  CALL ins('qa_lgs_s_dispatcher',9720,'o'); CALL ins('qa_lgs_s_billing',    9720,'am');
  -- Logistics professional (9721)
  CALL ins('qa_lgs_p_owner',     9721,'a'); CALL ins('qa_lgs_p_manager',    9721,'m');
  CALL ins('qa_lgs_p_dispatcher',9721,'o'); CALL ins('qa_lgs_p_acct',       9721,'am');
  CALL ins('qa_lgs_p_hr',        9721,'o'); CALL ins('qa_lgs_p_crm',        9721,'o');
  CALL ins('qa_lgs_p_mis',       9721,'r');
  -- Logistics regional (9722–9726)
  CALL ins('qa_lgs_ae_owner',    9722,'a'); CALL ins('qa_lgs_ae_manager',   9722,'m');
  CALL ins('qa_lgs_ae_dispatcher',9722,'o'); CALL ins('qa_lgs_ae_acct',     9722,'am');
  CALL ins('qa_lgs_us_owner',    9723,'a'); CALL ins('qa_lgs_us_manager',   9723,'m');
  CALL ins('qa_lgs_us_dispatcher',9723,'o'); CALL ins('qa_lgs_us_acct',     9723,'am');
  CALL ins('qa_lgs_eu_owner',    9724,'a'); CALL ins('qa_lgs_eu_manager',   9724,'m');
  CALL ins('qa_lgs_eu_dispatcher',9724,'o'); CALL ins('qa_lgs_eu_acct',     9724,'am');
  CALL ins('qa_lgs_sg_owner',    9725,'a'); CALL ins('qa_lgs_sg_manager',   9725,'m');
  CALL ins('qa_lgs_sg_dispatcher',9725,'o'); CALL ins('qa_lgs_sg_acct',     9725,'am');
  CALL ins('qa_lgs_au_owner',    9726,'a'); CALL ins('qa_lgs_au_manager',   9726,'m');
  CALL ins('qa_lgs_au_dispatcher',9726,'o'); CALL ins('qa_lgs_au_acct',     9726,'am');

  -- ── REAL ESTATE enterprise (9800) ───────────────────────────────────────
  CALL ins('qa_re_owner',        9800,'a');
  CALL ins('qa_re_manager',      9800,'m');
  CALL ins('qa_re_sales_exec',   9800,'o');
  CALL ins('qa_re_site_engineer',9800,'o');
  CALL ins('qa_re_acct',         9800,'am');
  CALL ins('qa_re_hr',           9800,'o');
  CALL ins('qa_re_crm',          9800,'o');
  CALL ins('qa_re_sales',        9800,'o');
  CALL ins('qa_re_mis',          9800,'r');
  CALL ins('qa_re_wh',           9800,'o');
  CALL ins('qa_re_prod',         9800,'o');
  CALL ins('qa_re_assets',       9800,'o');
  -- RE starter (9820)
  CALL ins('qa_re_s_owner',      9820,'a'); CALL ins('qa_re_s_manager',     9820,'m');
  CALL ins('qa_re_s_sales_exec', 9820,'o'); CALL ins('qa_re_s_billing',     9820,'am');
  -- RE professional (9821)
  CALL ins('qa_re_p_owner',      9821,'a'); CALL ins('qa_re_p_manager',     9821,'m');
  CALL ins('qa_re_p_sales_exec', 9821,'o'); CALL ins('qa_re_p_acct',        9821,'am');
  CALL ins('qa_re_p_hr',         9821,'o'); CALL ins('qa_re_p_crm',         9821,'o');
  CALL ins('qa_re_p_mis',        9821,'r');
  -- RE regional (9822–9826) — add role users
  CALL ins('qa_re_ae_owner',     9822,'a'); CALL ins('qa_re_ae_manager',    9822,'m');
  CALL ins('qa_re_ae_sales_exec',9822,'o'); CALL ins('qa_re_ae_acct',       9822,'am');
  CALL ins('qa_re_us_owner',     9823,'a'); CALL ins('qa_re_us_manager',    9823,'m');
  CALL ins('qa_re_us_sales_exec',9823,'o'); CALL ins('qa_re_us_acct',       9823,'am');
  CALL ins('qa_re_eu_owner',     9824,'a'); CALL ins('qa_re_eu_manager',    9824,'m');
  CALL ins('qa_re_eu_sales_exec',9824,'o'); CALL ins('qa_re_eu_acct',       9824,'am');
  CALL ins('qa_re_sg_owner',     9825,'a'); CALL ins('qa_re_sg_manager',    9825,'m');
  CALL ins('qa_re_sg_sales_exec',9825,'o'); CALL ins('qa_re_sg_acct',       9825,'am');
  CALL ins('qa_re_au_owner',     9826,'a'); CALL ins('qa_re_au_manager',    9826,'m');
  CALL ins('qa_re_au_sales_exec',9826,'o'); CALL ins('qa_re_au_acct',       9826,'am');

  -- ── AGRICULTURE enterprise (9900) ───────────────────────────────────────
  CALL ins('qa_agr_e_owner',     9900,'a');
  CALL ins('qa_agr_e_manager',   9900,'m');
  CALL ins('qa_agr_e_super',     9900,'o');
  CALL ins('qa_agr_e_qc',        9900,'r');
  CALL ins('qa_agr_e_acct',      9900,'am');
  CALL ins('qa_agr_e_hr',        9900,'o');
  CALL ins('qa_agr_e_mis',       9900,'r');
  CALL ins('qa_agr_e_crm',       9900,'o');
  CALL ins('qa_agr_e_wh',        9900,'o');
  -- Agr starter (9920)
  CALL ins('qa_agr_s_owner',     9920,'a'); CALL ins('qa_agr_s_manager',    9920,'m');
  CALL ins('qa_agr_s_super',     9920,'o');
  -- Agr professional (9921)
  CALL ins('qa_agr_p_owner',     9921,'a'); CALL ins('qa_agr_p_manager',    9921,'m');
  CALL ins('qa_agr_p_acct',      9921,'am');
  -- Agr regional (9922–9926)
  CALL ins('qa_agr_ae_owner',    9922,'a'); CALL ins('qa_agr_ae_manager',   9922,'m');
  CALL ins('qa_agr_ae_supervisor',9922,'o'); CALL ins('qa_agr_ae_acct',     9922,'am');
  CALL ins('qa_agr_us_owner',    9923,'a'); CALL ins('qa_agr_us_manager',   9923,'m');
  CALL ins('qa_agr_us_supervisor',9923,'o'); CALL ins('qa_agr_us_acct',     9923,'am');
  CALL ins('qa_agr_eu_owner',    9924,'a'); CALL ins('qa_agr_eu_manager',   9924,'m');
  CALL ins('qa_agr_eu_supervisor',9924,'o'); CALL ins('qa_agr_eu_acct',     9924,'am');
  CALL ins('qa_agr_sg_owner',    9925,'a'); CALL ins('qa_agr_sg_manager',   9925,'m');
  CALL ins('qa_agr_sg_supervisor',9925,'o'); CALL ins('qa_agr_sg_acct',     9925,'am');
  CALL ins('qa_agr_au_owner',    9926,'a'); CALL ins('qa_agr_au_manager',   9926,'m');
  CALL ins('qa_agr_au_supervisor',9926,'o'); CALL ins('qa_agr_au_acct',     9926,'am');

  -- ── EDUCATION enterprise (9950) ─────────────────────────────────────────
  CALL ins('qa_edu_e_owner',     9950,'a');
  CALL ins('qa_edu_e_admin',     9950,'m');
  CALL ins('qa_edu_e_fee',       9950,'o');
  CALL ins('qa_edu_e_teacher',   9950,'o');
  CALL ins('qa_edu_e_finance',   9950,'am');
  CALL ins('qa_edu_e_exam',      9950,'o');
  CALL ins('qa_edu_e_lib',       9950,'o');
  CALL ins('qa_edu_e_hr',        9950,'o');
  CALL ins('qa_edu_e_mis',       9950,'r');
  -- Edu starter (9970)
  CALL ins('qa_edu_s_owner',     9970,'a'); CALL ins('qa_edu_s_admin',      9970,'m');
  CALL ins('qa_edu_s_fee',       9970,'o');
  -- Edu professional (9971)
  CALL ins('qa_edu_p_owner',     9971,'a'); CALL ins('qa_edu_p_admin',      9971,'m');
  CALL ins('qa_edu_p_finance',   9971,'am');
  -- Edu regional (9972–9976)
  CALL ins('qa_edu_ae_owner',    9972,'a'); CALL ins('qa_edu_ae_principal', 9972,'m');
  CALL ins('qa_edu_ae_fee_collector',9972,'o'); CALL ins('qa_edu_ae_acct',  9972,'am');
  CALL ins('qa_edu_us_owner',    9973,'a'); CALL ins('qa_edu_us_principal', 9973,'m');
  CALL ins('qa_edu_us_fee_collector',9973,'o'); CALL ins('qa_edu_us_acct',  9973,'am');
  CALL ins('qa_edu_eu_owner',    9974,'a'); CALL ins('qa_edu_eu_principal', 9974,'m');
  CALL ins('qa_edu_eu_fee_collector',9974,'o'); CALL ins('qa_edu_eu_acct',  9974,'am');
  CALL ins('qa_edu_sg_owner',    9975,'a'); CALL ins('qa_edu_sg_principal', 9975,'m');
  CALL ins('qa_edu_sg_fee_collector',9975,'o'); CALL ins('qa_edu_sg_acct',  9975,'am');
  CALL ins('qa_edu_au_owner',    9976,'a'); CALL ins('qa_edu_au_principal', 9976,'m');
  CALL ins('qa_edu_au_fee_collector',9976,'o'); CALL ins('qa_edu_au_acct',  9976,'am');

  -- ── GOLD enterprise (8000 — roles already exist, just add users) ─────────
  CALL ins('qa_gld_owner',       8000,'a');
  CALL ins('qa_gld_manager',     8000,'m');
  CALL ins('qa_gld_cashier',     8000,'o');
  CALL ins('qa_gld_acct',        8000,'am');
  -- Gold regional users (add to existing 8022–8026)
  CALL ins('qa_gld_ae_owner',    8022,'a'); CALL ins('qa_gld_ae_manager',   8022,'m');
  CALL ins('qa_gld_ae_sales_staff',8022,'o'); CALL ins('qa_gld_ae_acct',    8022,'am');
  CALL ins('qa_gld_us_owner',    8023,'a'); CALL ins('qa_gld_us_manager',   8023,'m');
  CALL ins('qa_gld_us_sales_staff',8023,'o'); CALL ins('qa_gld_us_acct',    8023,'am');
  CALL ins('qa_gld_eu_owner',    8024,'a'); CALL ins('qa_gld_eu_manager',   8024,'m');
  CALL ins('qa_gld_eu_sales_staff',8024,'o'); CALL ins('qa_gld_eu_acct',    8024,'am');
  CALL ins('qa_gld_sg_owner',    8025,'a'); CALL ins('qa_gld_sg_manager',   8025,'m');
  CALL ins('qa_gld_sg_sales_staff',8025,'o'); CALL ins('qa_gld_sg_acct',    8025,'am');
  CALL ins('qa_gld_au_owner',    8026,'a'); CALL ins('qa_gld_au_manager',   8026,'m');
  CALL ins('qa_gld_au_sales_staff',8026,'o'); CALL ins('qa_gld_au_acct',    8026,'am');

  -- ── RETAIL/POS enterprise (8100) ────────────────────────────────────────
  CALL ins('qa_rtl_owner',       8100,'a');
  CALL ins('qa_rtl_manager',     8100,'m');
  CALL ins('qa_rtl_cashier',     8100,'o');
  CALL ins('qa_rtl_stock_clerk', 8100,'o');
  CALL ins('qa_rtl_acct',        8100,'am');
  CALL ins('qa_rtl_hr',          8100,'o');
  CALL ins('qa_rtl_crm',         8100,'o');
  CALL ins('qa_rtl_sales',       8100,'o');
  CALL ins('qa_rtl_mis',         8100,'r');
  CALL ins('qa_rtl_wh',          8100,'o');
  CALL ins('qa_rtl_prod',        8100,'o');
  CALL ins('qa_rtl_assets',      8100,'o');
  -- Retail starter (8120)
  CALL ins('qa_rtl_s_owner',     8120,'a'); CALL ins('qa_rtl_s_manager',    8120,'m');
  CALL ins('qa_rtl_s_cashier',   8120,'o'); CALL ins('qa_rtl_s_billing',    8120,'am');
  -- Retail professional (8121)
  CALL ins('qa_rtl_p_owner',     8121,'a'); CALL ins('qa_rtl_p_manager',    8121,'m');
  CALL ins('qa_rtl_p_cashier',   8121,'o'); CALL ins('qa_rtl_p_acct',       8121,'am');
  CALL ins('qa_rtl_p_hr',        8121,'o'); CALL ins('qa_rtl_p_crm',        8121,'o');
  CALL ins('qa_rtl_p_mis',       8121,'r');
  -- Retail regional (8122–8126)
  CALL ins('qa_rtl_ae_owner',    8122,'a'); CALL ins('qa_rtl_ae_manager',   8122,'m');
  CALL ins('qa_rtl_ae_cashier',  8122,'o'); CALL ins('qa_rtl_ae_acct',      8122,'am');
  CALL ins('qa_rtl_us_owner',    8123,'a'); CALL ins('qa_rtl_us_manager',   8123,'m');
  CALL ins('qa_rtl_us_cashier',  8123,'o'); CALL ins('qa_rtl_us_acct',      8123,'am');
  CALL ins('qa_rtl_eu_owner',    8124,'a'); CALL ins('qa_rtl_eu_manager',   8124,'m');
  CALL ins('qa_rtl_eu_cashier',  8124,'o'); CALL ins('qa_rtl_eu_acct',      8124,'am');
  CALL ins('qa_rtl_sg_owner',    8125,'a'); CALL ins('qa_rtl_sg_manager',   8125,'m');
  CALL ins('qa_rtl_sg_cashier',  8125,'o'); CALL ins('qa_rtl_sg_acct',      8125,'am');
  CALL ins('qa_rtl_au_owner',    8126,'a'); CALL ins('qa_rtl_au_manager',   8126,'m');
  CALL ins('qa_rtl_au_cashier',  8126,'o'); CALL ins('qa_rtl_au_acct',      8126,'am');

  -- ── MANUFACTURING enterprise (8200) ─────────────────────────────────────
  CALL ins('qa_mfg_owner',       8200,'a');
  CALL ins('qa_mfg_manager',     8200,'m');
  CALL ins('qa_mfg_operator',    8200,'o');
  CALL ins('qa_mfg_qc',          8200,'r');
  CALL ins('qa_mfg_acct',        8200,'am');
  CALL ins('qa_mfg_hr',          8200,'o');
  CALL ins('qa_mfg_mis',         8200,'r');
  CALL ins('qa_mfg_store',       8200,'o');
  CALL ins('qa_mfg_planner',     8200,'o');
  -- Mfg starter (8220)
  CALL ins('qa_mfg_s_owner',     8220,'a'); CALL ins('qa_mfg_s_manager',    8220,'m');
  CALL ins('qa_mfg_s_operator',  8220,'o'); CALL ins('qa_mfg_s_billing',    8220,'am');
  CALL ins('qa_mfg_s_purchase',  8220,'o');
  -- Mfg professional (8221)
  CALL ins('qa_mfg_p_owner',     8221,'a'); CALL ins('qa_mfg_p_manager',    8221,'m');
  CALL ins('qa_mfg_p_operator',  8221,'o'); CALL ins('qa_mfg_p_acct',       8221,'am');
  CALL ins('qa_mfg_p_mis',       8221,'r');
  -- Mfg regional (8222–8226)
  CALL ins('qa_mfg_ae_owner',    8222,'a'); CALL ins('qa_mfg_ae_manager',   8222,'m');
  CALL ins('qa_mfg_ae_operator', 8222,'o'); CALL ins('qa_mfg_ae_acct',      8222,'am');
  CALL ins('qa_mfg_us_owner',    8223,'a'); CALL ins('qa_mfg_us_manager',   8223,'m');
  CALL ins('qa_mfg_us_operator', 8223,'o'); CALL ins('qa_mfg_us_acct',      8223,'am');
  CALL ins('qa_mfg_eu_owner',    8224,'a'); CALL ins('qa_mfg_eu_manager',   8224,'m');
  CALL ins('qa_mfg_eu_operator', 8224,'o'); CALL ins('qa_mfg_eu_acct',      8224,'am');
  CALL ins('qa_mfg_sg_owner',    8225,'a'); CALL ins('qa_mfg_sg_manager',   8225,'m');
  CALL ins('qa_mfg_sg_operator', 8225,'o'); CALL ins('qa_mfg_sg_acct',      8225,'am');
  CALL ins('qa_mfg_au_owner',    8226,'a'); CALL ins('qa_mfg_au_manager',   8226,'m');
  CALL ins('qa_mfg_au_operator', 8226,'o'); CALL ins('qa_mfg_au_acct',      8226,'am');

  -- ── FINANCE enterprise (8300) ────────────────────────────────────────────
  CALL ins('qa_fin_owner',       8300,'a');
  CALL ins('qa_fin_cfo',         8300,'m');
  CALL ins('qa_fin_accountant',  8300,'o');
  CALL ins('qa_fin_ap_clerk',    8300,'o');
  CALL ins('qa_fin_ar_clerk',    8300,'o');
  CALL ins('qa_fin_acct',        8300,'am');
  CALL ins('qa_fin_hr',          8300,'o');
  CALL ins('qa_fin_crm',         8300,'o');
  CALL ins('qa_fin_sales',       8300,'o');
  CALL ins('qa_fin_mis',         8300,'r');
  CALL ins('qa_fin_wh',          8300,'o');
  CALL ins('qa_fin_assets',      8300,'o');
  -- Finance starter (8320)
  CALL ins('qa_fin_s_owner',     8320,'a'); CALL ins('qa_fin_s_accountant',  8320,'o');
  CALL ins('qa_fin_s_billing',   8320,'am');
  -- Finance professional (8321)
  CALL ins('qa_fin_p_owner',     8321,'a'); CALL ins('qa_fin_p_cfo',         8321,'m');
  CALL ins('qa_fin_p_accountant',8321,'o'); CALL ins('qa_fin_p_acct',        8321,'am');
  CALL ins('qa_fin_p_hr',        8321,'o'); CALL ins('qa_fin_p_crm',         8321,'o');
  CALL ins('qa_fin_p_mis',       8321,'r');
  -- Finance regional (8322–8326)
  CALL ins('qa_fin_ae_owner',    8322,'a'); CALL ins('qa_fin_ae_cfo',        8322,'m');
  CALL ins('qa_fin_ae_accountant',8322,'o'); CALL ins('qa_fin_ae_acct',      8322,'am');
  CALL ins('qa_fin_us_owner',    8323,'a'); CALL ins('qa_fin_us_cfo',        8323,'m');
  CALL ins('qa_fin_us_accountant',8323,'o'); CALL ins('qa_fin_us_acct',      8323,'am');
  CALL ins('qa_fin_eu_owner',    8324,'a'); CALL ins('qa_fin_eu_cfo',        8324,'m');
  CALL ins('qa_fin_eu_accountant',8324,'o'); CALL ins('qa_fin_eu_acct',      8324,'am');
  CALL ins('qa_fin_sg_owner',    8325,'a'); CALL ins('qa_fin_sg_cfo',        8325,'m');
  CALL ins('qa_fin_sg_accountant',8325,'o'); CALL ins('qa_fin_sg_acct',      8325,'am');
  CALL ins('qa_fin_au_owner',    8326,'a'); CALL ins('qa_fin_au_cfo',        8326,'m');
  CALL ins('qa_fin_au_accountant',8326,'o'); CALL ins('qa_fin_au_acct',      8326,'am');

  -- ── ECOMMERCE enterprise (8400) ─────────────────────────────────────────
  CALL ins('qa_eco_owner',       8400,'a');
  CALL ins('qa_eco_manager',     8400,'m');
  CALL ins('qa_eco_ops',         8400,'o');
  CALL ins('qa_eco_catalog',     8400,'o');
  CALL ins('qa_eco_acct',        8400,'am');
  CALL ins('qa_eco_hr',          8400,'o');
  CALL ins('qa_eco_crm',         8400,'o');
  CALL ins('qa_eco_sales',       8400,'o');
  CALL ins('qa_eco_mis',         8400,'r');
  CALL ins('qa_eco_wh',          8400,'o');
  CALL ins('qa_eco_prod',        8400,'o');
  CALL ins('qa_eco_assets',      8400,'o');
  -- Eco starter (8420)
  CALL ins('qa_eco_s_owner',     8420,'a'); CALL ins('qa_eco_s_ops',         8420,'o');
  CALL ins('qa_eco_s_catalog',   8420,'o'); CALL ins('qa_eco_s_billing',     8420,'am');
  -- Eco professional (8421)
  CALL ins('qa_eco_p_owner',     8421,'a'); CALL ins('qa_eco_p_manager',     8421,'m');
  CALL ins('qa_eco_p_ops',       8421,'o'); CALL ins('qa_eco_p_acct',        8421,'am');
  CALL ins('qa_eco_p_hr',        8421,'o'); CALL ins('qa_eco_p_crm',         8421,'o');
  CALL ins('qa_eco_p_mis',       8421,'r');
  -- Eco regional (8422–8426)
  CALL ins('qa_eco_ae_owner',    8422,'a'); CALL ins('qa_eco_ae_manager',    8422,'m');
  CALL ins('qa_eco_ae_ops',      8422,'o'); CALL ins('qa_eco_ae_acct',       8422,'am');
  CALL ins('qa_eco_us_owner',    8423,'a'); CALL ins('qa_eco_us_manager',    8423,'m');
  CALL ins('qa_eco_us_ops',      8423,'o'); CALL ins('qa_eco_us_acct',       8423,'am');
  CALL ins('qa_eco_eu_owner',    8424,'a'); CALL ins('qa_eco_eu_manager',    8424,'m');
  CALL ins('qa_eco_eu_ops',      8424,'o'); CALL ins('qa_eco_eu_acct',       8424,'am');
  CALL ins('qa_eco_sg_owner',    8425,'a'); CALL ins('qa_eco_sg_manager',    8425,'m');
  CALL ins('qa_eco_sg_ops',      8425,'o'); CALL ins('qa_eco_sg_acct',       8425,'am');
  CALL ins('qa_eco_au_owner',    8426,'a'); CALL ins('qa_eco_au_manager',    8426,'m');
  CALL ins('qa_eco_au_ops',      8426,'o'); CALL ins('qa_eco_au_acct',       8426,'am');

  -- ── HR/PAYROLL enterprise (8500) ─────────────────────────────────────────
  CALL ins('qa_hr_owner',        8500,'a');
  CALL ins('qa_hr_manager',      8500,'m');
  CALL ins('qa_hr_recruiter',    8500,'o');
  CALL ins('qa_hr_payroll_exec', 8500,'o');
  CALL ins('qa_hr_acct',         8500,'am');
  CALL ins('qa_hr_hr',           8500,'o');
  CALL ins('qa_hr_crm',          8500,'o');
  CALL ins('qa_hr_sales',        8500,'o');
  CALL ins('qa_hr_mis',          8500,'r');
  CALL ins('qa_hr_wh',           8500,'o');
  CALL ins('qa_hr_prod',         8500,'o');
  CALL ins('qa_hr_assets',       8500,'o');
  -- HR starter (8520)
  CALL ins('qa_hr_s_owner',      8520,'a'); CALL ins('qa_hr_s_manager',      8520,'m');
  CALL ins('qa_hr_s_payroll_exec',8520,'o'); CALL ins('qa_hr_s_billing',     8520,'am');
  -- HR professional (8521)
  CALL ins('qa_hr_p_owner',      8521,'a'); CALL ins('qa_hr_p_manager',      8521,'m');
  CALL ins('qa_hr_p_payroll_exec',8521,'o'); CALL ins('qa_hr_p_acct',        8521,'am');
  CALL ins('qa_hr_p_hr',         8521,'o'); CALL ins('qa_hr_p_crm',          8521,'o');
  CALL ins('qa_hr_p_mis',        8521,'r');
  -- HR regional (8522–8526)
  CALL ins('qa_hr_ae_owner',     8522,'a'); CALL ins('qa_hr_ae_manager',     8522,'m');
  CALL ins('qa_hr_ae_payroll_exec',8522,'o'); CALL ins('qa_hr_ae_acct',      8522,'am');
  CALL ins('qa_hr_us_owner',     8523,'a'); CALL ins('qa_hr_us_manager',     8523,'m');
  CALL ins('qa_hr_us_payroll_exec',8523,'o'); CALL ins('qa_hr_us_acct',      8523,'am');
  CALL ins('qa_hr_eu_owner',     8524,'a'); CALL ins('qa_hr_eu_manager',     8524,'m');
  CALL ins('qa_hr_eu_payroll_exec',8524,'o'); CALL ins('qa_hr_eu_acct',      8524,'am');
  CALL ins('qa_hr_sg_owner',     8525,'a'); CALL ins('qa_hr_sg_manager',     8525,'m');
  CALL ins('qa_hr_sg_payroll_exec',8525,'o'); CALL ins('qa_hr_sg_acct',      8525,'am');
  CALL ins('qa_hr_au_owner',     8526,'a'); CALL ins('qa_hr_au_manager',     8526,'m');
  CALL ins('qa_hr_au_payroll_exec',8526,'o'); CALL ins('qa_hr_au_acct',      8526,'am');

END $$;

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT
  t.id,
  t.name,
  t.currency_code,
  t.tax_regime,
  COUNT(DISTINCT r.id) AS roles,
  COUNT(DISTINCT u.id) AS users
FROM tenants t
LEFT JOIN roles r ON r.tenant_id = t.id
LEFT JOIN users u ON u.tenant_id = t.id
WHERE t.id IN (
  9001,9022,9023,9024,9025,9026,
  9100,9160,9161,9162,9163,9164,9165,9166,
  9200,9220,9221,9222,9223,9224,9225,9226,
  9300,9320,9321,9322,9323,9324,9325,9326,
  9400,9420,9421,9422,9423,9424,9425,9426,
  9500,9520,9521,9522,9523,9524,9525,9526,
  9600,9620,9621,9622,9623,9624,9625,9626,
  9700,9720,9721,9722,9723,9724,9725,9726,
  9800,9820,9821,9822,9823,9824,9825,9826,
  9900,9920,9921,9922,9923,9924,9925,9926,
  9950,9970,9971,9972,9973,9974,9975,9976,
  8000,8020,8021,8022,8023,8024,8025,8026,
  8100,8120,8121,8122,8123,8124,8125,8126,
  8200,8220,8221,8222,8223,8224,8225,8226,
  8300,8320,8321,8322,8323,8324,8325,8326,
  8400,8420,8421,8422,8423,8424,8425,8426,
  8500,8520,8521,8522,8523,8524,8525,8526
)
GROUP BY t.id, t.name, t.currency_code, t.tax_regime
ORDER BY t.id;
