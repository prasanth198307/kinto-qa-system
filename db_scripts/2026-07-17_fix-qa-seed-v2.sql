-- QA Seed Fix v2 — flat inserts, no nested procedures
-- Password hash for Test@1234
-- $2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.

-- Fix Gold/Nidhi/Logistics/Real-Estate regional currency_code
BEGIN;
UPDATE tenants SET currency_code='AED', currency='AED' WHERE id IN (8022,9522,9722,9822);
UPDATE tenants SET currency_code='USD', currency='USD' WHERE id IN (8023,9523,9723,9823);
UPDATE tenants SET currency_code='EUR', currency='EUR' WHERE id IN (8024,9524,9724,9824);
UPDATE tenants SET currency_code='SGD', currency='SGD' WHERE id IN (8025,9525,9725,9825);
UPDATE tenants SET currency_code='AUD', currency='AUD' WHERE id IN (8026,9526,9726,9826);
COMMIT;

-- Restaurant regional
BEGIN;
INSERT INTO tenants (id,name,slug,plan,currency,currency_code,tax_regime,country_code,status) VALUES
  (9022,'QA Restaurant UAE','qa-rst-ae','restaurant_enterprise','AED','AED','vat','AE','active'),
  (9023,'QA Restaurant USA','qa-rst-us','restaurant_enterprise','USD','USD','sales_tax','US','active'),
  (9024,'QA Restaurant EU','qa-rst-eu','restaurant_enterprise','EUR','EUR','vat','DE','active'),
  (9025,'QA Restaurant SG','qa-rst-sg','restaurant_enterprise','SGD','SGD','gst','SG','active'),
  (9026,'QA Restaurant AU','qa-rst-au','restaurant_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;
COMMIT;

-- Hotel (9100 enterprise, 9165 starter, 9166 pro, 9160-9164 regional)
BEGIN;
INSERT INTO tenants (id,name,slug,plan,currency,currency_code,tax_regime,country_code,status) VALUES
  (9100,'QA Hotel Enterprise India','qa-htl-e2','hotel_enterprise','INR','INR','gst','IN','active'),
  (9165,'QA Hotel Starter India','qa-htl-s2','hotel_starter','INR','INR','gst','IN','active'),
  (9166,'QA Hotel Pro India','qa-htl-p2','hotel_professional','INR','INR','gst','IN','active'),
  (9160,'QA Hotel UAE','qa-htl-ae','hotel_enterprise','AED','AED','vat','AE','active'),
  (9161,'QA Hotel USA','qa-htl-us','hotel_enterprise','USD','USD','sales_tax','US','active'),
  (9162,'QA Hotel EU','qa-htl-eu','hotel_enterprise','EUR','EUR','vat','DE','active'),
  (9163,'QA Hotel SG','qa-htl-sg','hotel_enterprise','SGD','SGD','gst','SG','active'),
  (9164,'QA Hotel AU','qa-htl-au','hotel_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;
COMMIT;

BEGIN;
INSERT INTO tenants (id,name,slug,plan,currency,currency_code,tax_regime,country_code,status) VALUES
  (9400,'QA NGO Enterprise India','qa-ngo-e2','ngo_enterprise','INR','INR','gst','IN','active'),
  (9420,'QA NGO Starter India','qa-ngo-s2','ngo_starter','INR','INR','gst','IN','active'),
  (9421,'QA NGO Pro India','qa-ngo-p2','ngo_professional','INR','INR','gst','IN','active'),
  (9422,'QA NGO UAE','qa-ngo-ae','ngo_enterprise','AED','AED','vat','AE','active'),
  (9423,'QA NGO USA','qa-ngo-us','ngo_enterprise','USD','USD','sales_tax','US','active'),
  (9424,'QA NGO EU','qa-ngo-eu','ngo_enterprise','EUR','EUR','vat','DE','active'),
  (9425,'QA NGO SG','qa-ngo-sg','ngo_enterprise','SGD','SGD','gst','SG','active'),
  (9426,'QA NGO AU','qa-ngo-au','ngo_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;
COMMIT;

BEGIN;
INSERT INTO tenants (id,name,slug,plan,currency,currency_code,tax_regime,country_code,status) VALUES
  (9600,'QA CRM Enterprise India','qa-crm-e2','crm_enterprise','INR','INR','gst','IN','active'),
  (9620,'QA CRM Starter India','qa-crm-s2','crm_starter','INR','INR','gst','IN','active'),
  (9621,'QA CRM Pro India','qa-crm-p2','crm_professional','INR','INR','gst','IN','active'),
  (9622,'QA CRM UAE','qa-crm-ae','crm_enterprise','AED','AED','vat','AE','active'),
  (9623,'QA CRM USA','qa-crm-us','crm_enterprise','USD','USD','sales_tax','US','active'),
  (9624,'QA CRM EU','qa-crm-eu','crm_enterprise','EUR','EUR','vat','DE','active'),
  (9625,'QA CRM SG','qa-crm-sg','crm_enterprise','SGD','SGD','gst','SG','active'),
  (9626,'QA CRM AU','qa-crm-au','crm_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;
COMMIT;

BEGIN;
INSERT INTO tenants (id,name,slug,plan,currency,currency_code,tax_regime,country_code,status) VALUES
  (9900,'QA Agriculture Enterprise India','qa-agr-e2','agriculture_enterprise','INR','INR','gst','IN','active'),
  (9920,'QA Agriculture Starter India','qa-agr-s2','agriculture_starter','INR','INR','gst','IN','active'),
  (9921,'QA Agriculture Pro India','qa-agr-p2','agriculture_professional','INR','INR','gst','IN','active'),
  (9922,'QA Agriculture UAE','qa-agr-ae','agriculture_enterprise','AED','AED','vat','AE','active'),
  (9923,'QA Agriculture USA','qa-agr-us','agriculture_enterprise','USD','USD','sales_tax','US','active'),
  (9924,'QA Agriculture EU','qa-agr-eu','agriculture_enterprise','EUR','EUR','vat','DE','active'),
  (9925,'QA Agriculture SG','qa-agr-sg','agriculture_enterprise','SGD','SGD','gst','SG','active'),
  (9926,'QA Agriculture AU','qa-agr-au','agriculture_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;
COMMIT;

BEGIN;
INSERT INTO tenants (id,name,slug,plan,currency,currency_code,tax_regime,country_code,status) VALUES
  (9950,'QA Education Enterprise India','qa-edu-e2','education_enterprise','INR','INR','gst','IN','active'),
  (9970,'QA Education Starter India','qa-edu-s2','education_starter','INR','INR','gst','IN','active'),
  (9971,'QA Education Pro India','qa-edu-p2','education_professional','INR','INR','gst','IN','active'),
  (9972,'QA Education UAE','qa-edu-ae','education_enterprise','AED','AED','vat','AE','active'),
  (9973,'QA Education USA','qa-edu-us','education_enterprise','USD','USD','sales_tax','US','active'),
  (9974,'QA Education EU','qa-edu-eu','education_enterprise','EUR','EUR','vat','DE','active'),
  (9975,'QA Education SG','qa-edu-sg','education_enterprise','SGD','SGD','gst','SG','active'),
  (9976,'QA Education AU','qa-edu-au','education_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;
COMMIT;

BEGIN;
INSERT INTO tenants (id,name,slug,plan,currency,currency_code,tax_regime,country_code,status) VALUES
  (8100,'QA Retail Enterprise India','qa-rtl-e','pos_enterprise','INR','INR','gst','IN','active'),
  (8120,'QA Retail Starter India','qa-rtl-s','pos_starter','INR','INR','gst','IN','active'),
  (8121,'QA Retail Pro India','qa-rtl-p','pos_professional','INR','INR','gst','IN','active'),
  (8122,'QA Retail UAE','qa-rtl-ae','pos_enterprise','AED','AED','vat','AE','active'),
  (8123,'QA Retail USA','qa-rtl-us','pos_enterprise','USD','USD','sales_tax','US','active'),
  (8124,'QA Retail EU','qa-rtl-eu','pos_enterprise','EUR','EUR','vat','DE','active'),
  (8125,'QA Retail SG','qa-rtl-sg','pos_enterprise','SGD','SGD','gst','SG','active'),
  (8126,'QA Retail AU','qa-rtl-au','pos_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;
COMMIT;

BEGIN;
INSERT INTO tenants (id,name,slug,plan,currency,currency_code,tax_regime,country_code,status) VALUES
  (8200,'QA Manufacturing Enterprise India','qa-mfg-e','manufacturing_enterprise','INR','INR','gst','IN','active'),
  (8220,'QA Manufacturing Starter India','qa-mfg-s','manufacturing_starter','INR','INR','gst','IN','active'),
  (8221,'QA Manufacturing Pro India','qa-mfg-p','manufacturing_professional','INR','INR','gst','IN','active'),
  (8222,'QA Manufacturing UAE','qa-mfg-ae','manufacturing_enterprise','AED','AED','vat','AE','active'),
  (8223,'QA Manufacturing USA','qa-mfg-us','manufacturing_enterprise','USD','USD','sales_tax','US','active'),
  (8224,'QA Manufacturing EU','qa-mfg-eu','manufacturing_enterprise','EUR','EUR','vat','DE','active'),
  (8225,'QA Manufacturing SG','qa-mfg-sg','manufacturing_enterprise','SGD','SGD','gst','SG','active'),
  (8226,'QA Manufacturing AU','qa-mfg-au','manufacturing_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;
COMMIT;

BEGIN;
INSERT INTO tenants (id,name,slug,plan,currency,currency_code,tax_regime,country_code,status) VALUES
  (8300,'QA Finance Enterprise India','qa-fin-e','enterprise','INR','INR','gst','IN','active'),
  (8320,'QA Finance Starter India','qa-fin-s','basic','INR','INR','gst','IN','active'),
  (8321,'QA Finance Pro India','qa-fin-p','professional','INR','INR','gst','IN','active'),
  (8322,'QA Finance UAE','qa-fin-ae','enterprise','AED','AED','vat','AE','active'),
  (8323,'QA Finance USA','qa-fin-us','enterprise','USD','USD','sales_tax','US','active'),
  (8324,'QA Finance EU','qa-fin-eu','enterprise','EUR','EUR','vat','DE','active'),
  (8325,'QA Finance SG','qa-fin-sg','enterprise','SGD','SGD','gst','SG','active'),
  (8326,'QA Finance AU','qa-fin-au','enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;
COMMIT;

BEGIN;
INSERT INTO tenants (id,name,slug,plan,currency,currency_code,tax_regime,country_code,status) VALUES
  (8400,'QA Ecommerce Enterprise India','qa-eco-e','ecommerce_enterprise','INR','INR','gst','IN','active'),
  (8420,'QA Ecommerce Starter India','qa-eco-s','ecommerce_starter','INR','INR','gst','IN','active'),
  (8421,'QA Ecommerce Pro India','qa-eco-p','ecommerce_professional','INR','INR','gst','IN','active'),
  (8422,'QA Ecommerce UAE','qa-eco-ae','ecommerce_enterprise','AED','AED','vat','AE','active'),
  (8423,'QA Ecommerce USA','qa-eco-us','ecommerce_enterprise','USD','USD','sales_tax','US','active'),
  (8424,'QA Ecommerce EU','qa-eco-eu','ecommerce_enterprise','EUR','EUR','vat','DE','active'),
  (8425,'QA Ecommerce SG','qa-eco-sg','ecommerce_enterprise','SGD','SGD','gst','SG','active'),
  (8426,'QA Ecommerce AU','qa-eco-au','ecommerce_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;
COMMIT;

BEGIN;
INSERT INTO tenants (id,name,slug,plan,currency,currency_code,tax_regime,country_code,status) VALUES
  (8500,'QA HR Enterprise India','qa-hr-e','hr_enterprise','INR','INR','gst','IN','active'),
  (8520,'QA HR Starter India','qa-hr-s','hr_starter','INR','INR','gst','IN','active'),
  (8521,'QA HR Pro India','qa-hr-p','hr_professional','INR','INR','gst','IN','active'),
  (8522,'QA HR UAE','qa-hr-ae','hr_enterprise','AED','AED','vat','AE','active'),
  (8523,'QA HR USA','qa-hr-us','hr_enterprise','USD','USD','sales_tax','US','active'),
  (8524,'QA HR EU','qa-hr-eu','hr_enterprise','EUR','EUR','vat','DE','active'),
  (8525,'QA HR SG','qa-hr-sg','hr_enterprise','SGD','SGD','gst','SG','active'),
  (8526,'QA HR AU','qa-hr-au','hr_enterprise','AUD','AUD','gst','AU','active')
ON CONFLICT (id) DO NOTHING;
COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Roles
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
DO $$
DECLARE
  tids INT[] := ARRAY[
    9001,9022,9023,9024,9025,9026,
    9100,9106,9160,9161,9162,9163,9164,9165,9166,
    9109,9200,9220,9221,9222,9223,9224,9225,9226,
    9112,9300,9320,9321,9322,9323,9324,9325,9326,
    9115,9400,9420,9421,9422,9423,9424,9425,9426,
    9118,9520,9521,9522,9523,9524,9525,9526,
    9121,9600,9620,9621,9622,9623,9624,9625,9626,
    9124,9700,9720,9721,9722,9723,9724,9725,9726,
    9127,9800,9820,9821,9822,9823,9824,9825,9826,
    9130,9900,9920,9921,9922,9923,9924,9925,9926,
    9133,9950,9970,9971,9972,9973,9974,9975,9976,
    8000,8020,8021,8022,8023,8024,8025,8026,
    8100,8120,8121,8122,8123,8124,8125,8126,
    8200,8220,8221,8222,8223,8224,8225,8226,
    8300,8320,8321,8322,8323,8324,8325,8326,
    8400,8420,8421,8422,8423,8424,8425,8426,
    8500,8520,8521,8522,8523,8524,8525,8526
  ];
  tid INT;
BEGIN
  FOREACH tid IN ARRAY tids LOOP
    INSERT INTO roles (id,name,description,tenant_id,record_status) VALUES
      ('qa-r-'||tid||'-a',  'admin',           'QA admin',           tid, 1),
      ('qa-r-'||tid||'-m',  'manager',         'QA manager',         tid, 1),
      ('qa-r-'||tid||'-o',  'operator',        'QA operator',        tid, 1),
      ('qa-r-'||tid||'-r',  'reviewer',        'QA reviewer',        tid, 1),
      ('qa-r-'||tid||'-am', 'accountsmanager', 'QA accountsmanager', tid, 1)
    ON CONFLICT (name,tenant_id) DO NOTHING;
  END LOOP;
END $$;
COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Users — one giant DO block, inline logic per user
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
DO $$
DECLARE
  pw TEXT := '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.';
  u TEXT; tid INT; rc TEXT; rid TEXT; rname TEXT;
  -- (uname, tenantId, rolecode) triples
  data TEXT[][] := ARRAY[
    -- ── RESTAURANT enterprise 9001 ────────────────────────────────────────
    ARRAY['qa_e_owner','9001','a'],   ARRAY['qa_e_manager','9001','m'],
    ARRAY['qa_e_cashier','9001','o'], ARRAY['qa_e_steward','9001','r'],
    ARRAY['qa_e_chef','9001','r'],    ARRAY['qa_e_acct','9001','am'],
    ARRAY['qa_e_hr','9001','o'],      ARRAY['qa_e_crm','9001','o'],
    ARRAY['qa_e_sales','9001','o'],   ARRAY['qa_e_mis','9001','r'],
    ARRAY['qa_e_wh','9001','o'],      ARRAY['qa_e_prod','9001','o'],
    ARRAY['qa_e_assets','9001','o'],
    -- Regional restaurant
    ARRAY['qa_rst_ae_owner','9022','a'], ARRAY['qa_rst_ae_manager','9022','m'],
    ARRAY['qa_rst_ae_cashier','9022','o'], ARRAY['qa_rst_ae_acct','9022','am'],
    ARRAY['qa_rst_us_owner','9023','a'], ARRAY['qa_rst_us_manager','9023','m'],
    ARRAY['qa_rst_us_cashier','9023','o'], ARRAY['qa_rst_us_acct','9023','am'],
    ARRAY['qa_rst_eu_owner','9024','a'], ARRAY['qa_rst_eu_manager','9024','m'],
    ARRAY['qa_rst_eu_cashier','9024','o'], ARRAY['qa_rst_eu_acct','9024','am'],
    ARRAY['qa_rst_sg_owner','9025','a'], ARRAY['qa_rst_sg_manager','9025','m'],
    ARRAY['qa_rst_sg_cashier','9025','o'], ARRAY['qa_rst_sg_acct','9025','am'],
    ARRAY['qa_rst_au_owner','9026','a'], ARRAY['qa_rst_au_manager','9026','m'],
    ARRAY['qa_rst_au_cashier','9026','o'], ARRAY['qa_rst_au_acct','9026','am'],
    -- ── HOTEL enterprise 9100 ─────────────────────────────────────────────
    ARRAY['qa_htl_owner','9100','a'],         ARRAY['qa_htl_manager','9100','m'],
    ARRAY['qa_htl_receptionist','9100','o'],   ARRAY['qa_htl_housekeeping','9100','o'],
    ARRAY['qa_htl_acct','9100','am'],          ARRAY['qa_htl_hr','9100','o'],
    ARRAY['qa_htl_crm','9100','o'],            ARRAY['qa_htl_sales','9100','o'],
    ARRAY['qa_htl_mis','9100','r'],            ARRAY['qa_htl_wh','9100','o'],
    ARRAY['qa_htl_prod','9100','o'],           ARRAY['qa_htl_assets','9100','o'],
    -- Hotel starter 9165
    ARRAY['qa_htl_s_owner','9165','a'], ARRAY['qa_htl_s_manager','9165','m'],
    ARRAY['qa_htl_s_front_desk','9165','o'], ARRAY['qa_htl_s_billing','9165','am'],
    -- Hotel professional 9166
    ARRAY['qa_htl_p_owner','9166','a'], ARRAY['qa_htl_p_manager','9166','m'],
    ARRAY['qa_htl_p_front_desk','9166','o'], ARRAY['qa_htl_p_acct','9166','am'],
    ARRAY['qa_htl_p_hr','9166','o'], ARRAY['qa_htl_p_crm','9166','o'],
    ARRAY['qa_htl_p_mis','9166','r'],
    -- Hotel regional 9160-9164
    ARRAY['qa_htl_ae_owner','9160','a'], ARRAY['qa_htl_ae_mgr','9160','m'],
    ARRAY['qa_htl_ae_receptionist','9160','o'], ARRAY['qa_htl_ae_acct','9160','am'],
    ARRAY['qa_htl_us_owner','9161','a'], ARRAY['qa_htl_us_mgr','9161','m'],
    ARRAY['qa_htl_us_receptionist','9161','o'], ARRAY['qa_htl_us_acct','9161','am'],
    ARRAY['qa_htl_eu_owner','9162','a'], ARRAY['qa_htl_eu_mgr','9162','m'],
    ARRAY['qa_htl_eu_receptionist','9162','o'], ARRAY['qa_htl_eu_acct','9162','am'],
    ARRAY['qa_htl_sg_owner','9163','a'], ARRAY['qa_htl_sg_mgr','9163','m'],
    ARRAY['qa_htl_sg_receptionist','9163','o'], ARRAY['qa_htl_sg_acct','9163','am'],
    ARRAY['qa_htl_au_owner','9164','a'], ARRAY['qa_htl_au_mgr','9164','m'],
    ARRAY['qa_htl_au_receptionist','9164','o'], ARRAY['qa_htl_au_acct','9164','am'],
    -- ── HEALTHCARE enterprise 9200 ────────────────────────────────────────
    ARRAY['qa_hc_owner','9200','a'], ARRAY['qa_hc_doctor','9200','m'],
    ARRAY['qa_hc_nurse','9200','o'], ARRAY['qa_hc_receptionist','9200','o'],
    ARRAY['qa_hc_acct','9200','am'], ARRAY['qa_hc_hr','9200','o'],
    ARRAY['qa_hc_crm','9200','o'],   ARRAY['qa_hc_sales','9200','o'],
    ARRAY['qa_hc_mis','9200','r'],   ARRAY['qa_hc_wh','9200','o'],
    ARRAY['qa_hc_prod','9200','o'],  ARRAY['qa_hc_assets','9200','o'],
    ARRAY['qa_hc_s_owner','9220','a'], ARRAY['qa_hc_s_doctor','9220','m'],
    ARRAY['qa_hc_s_receptionist','9220','o'], ARRAY['qa_hc_s_billing','9220','am'],
    ARRAY['qa_hc_p_owner','9221','a'], ARRAY['qa_hc_p_doctor','9221','m'],
    ARRAY['qa_hc_p_receptionist','9221','o'], ARRAY['qa_hc_p_acct','9221','am'],
    ARRAY['qa_hc_p_hr','9221','o'], ARRAY['qa_hc_p_crm','9221','o'], ARRAY['qa_hc_p_mis','9221','r'],
    ARRAY['qa_hc_ae_owner','9222','a'], ARRAY['qa_hc_ae_doctor','9222','m'],
    ARRAY['qa_hc_ae_receptionist','9222','o'], ARRAY['qa_hc_ae_acct','9222','am'],
    ARRAY['qa_hc_us_owner','9223','a'], ARRAY['qa_hc_us_doctor','9223','m'],
    ARRAY['qa_hc_us_receptionist','9223','o'], ARRAY['qa_hc_us_acct','9223','am'],
    ARRAY['qa_hc_eu_owner','9224','a'], ARRAY['qa_hc_eu_doctor','9224','m'],
    ARRAY['qa_hc_eu_receptionist','9224','o'], ARRAY['qa_hc_eu_acct','9224','am'],
    ARRAY['qa_hc_sg_owner','9225','a'], ARRAY['qa_hc_sg_doctor','9225','m'],
    ARRAY['qa_hc_sg_receptionist','9225','o'], ARRAY['qa_hc_sg_acct','9225','am'],
    ARRAY['qa_hc_au_owner','9226','a'], ARRAY['qa_hc_au_doctor','9226','m'],
    ARRAY['qa_hc_au_receptionist','9226','o'], ARRAY['qa_hc_au_acct','9226','am'],
    -- ── PHARMACY enterprise 9300 ──────────────────────────────────────────
    ARRAY['qa_ph_owner','9300','a'], ARRAY['qa_ph_pharmacist','9300','m'],
    ARRAY['qa_ph_cashier','9300','o'], ARRAY['qa_ph_purchase','9300','o'],
    ARRAY['qa_ph_acct','9300','am'], ARRAY['qa_ph_hr','9300','o'],
    ARRAY['qa_ph_crm','9300','o'],   ARRAY['qa_ph_sales','9300','o'],
    ARRAY['qa_ph_mis','9300','r'],   ARRAY['qa_ph_wh','9300','o'],
    ARRAY['qa_ph_prod','9300','o'],  ARRAY['qa_ph_assets','9300','o'],
    ARRAY['qa_ph_s_owner','9320','a'], ARRAY['qa_ph_s_pharmacist','9320','m'],
    ARRAY['qa_ph_s_cashier','9320','o'], ARRAY['qa_ph_s_billing','9320','am'],
    ARRAY['qa_ph_p_owner','9321','a'], ARRAY['qa_ph_p_pharmacist','9321','m'],
    ARRAY['qa_ph_p_cashier','9321','o'], ARRAY['qa_ph_p_acct','9321','am'],
    ARRAY['qa_ph_p_hr','9321','o'], ARRAY['qa_ph_p_crm','9321','o'], ARRAY['qa_ph_p_mis','9321','r'],
    ARRAY['qa_ph_ae_owner','9322','a'], ARRAY['qa_ph_ae_pharmacist','9322','m'],
    ARRAY['qa_ph_ae_cashier','9322','o'], ARRAY['qa_ph_ae_acct','9322','am'],
    ARRAY['qa_ph_us_owner','9323','a'], ARRAY['qa_ph_us_pharmacist','9323','m'],
    ARRAY['qa_ph_us_cashier','9323','o'], ARRAY['qa_ph_us_acct','9323','am'],
    ARRAY['qa_ph_eu_owner','9324','a'], ARRAY['qa_ph_eu_pharmacist','9324','m'],
    ARRAY['qa_ph_eu_cashier','9324','o'], ARRAY['qa_ph_eu_acct','9324','am'],
    ARRAY['qa_ph_sg_owner','9325','a'], ARRAY['qa_ph_sg_pharmacist','9325','m'],
    ARRAY['qa_ph_sg_cashier','9325','o'], ARRAY['qa_ph_sg_acct','9325','am'],
    ARRAY['qa_ph_au_owner','9326','a'], ARRAY['qa_ph_au_pharmacist','9326','m'],
    ARRAY['qa_ph_au_cashier','9326','o'], ARRAY['qa_ph_au_acct','9326','am'],
    -- ── NGO enterprise 9400 ───────────────────────────────────────────────
    ARRAY['qa_ngo_owner','9400','a'], ARRAY['qa_ngo_manager','9400','m'],
    ARRAY['qa_ngo_field_worker','9400','o'], ARRAY['qa_ngo_donor_mgr','9400','o'],
    ARRAY['qa_ngo_acct','9400','am'], ARRAY['qa_ngo_hr','9400','o'],
    ARRAY['qa_ngo_crm','9400','o'],   ARRAY['qa_ngo_sales','9400','o'],
    ARRAY['qa_ngo_mis','9400','r'],   ARRAY['qa_ngo_wh','9400','o'],
    ARRAY['qa_ngo_prod','9400','o'],  ARRAY['qa_ngo_assets','9400','o'],
    ARRAY['qa_ngo_s_owner','9420','a'], ARRAY['qa_ngo_s_manager','9420','m'],
    ARRAY['qa_ngo_s_field_worker','9420','o'],
    ARRAY['qa_ngo_p_owner','9421','a'], ARRAY['qa_ngo_p_manager','9421','m'],
    ARRAY['qa_ngo_p_acct','9421','am'], ARRAY['qa_ngo_p_hr','9421','o'],
    ARRAY['qa_ngo_p_crm','9421','o'],  ARRAY['qa_ngo_p_mis','9421','r'],
    ARRAY['qa_ngo_ae_owner','9422','a'], ARRAY['qa_ngo_ae_manager','9422','m'],
    ARRAY['qa_ngo_ae_field_worker','9422','o'], ARRAY['qa_ngo_ae_acct','9422','am'],
    ARRAY['qa_ngo_us_owner','9423','a'], ARRAY['qa_ngo_us_manager','9423','m'],
    ARRAY['qa_ngo_us_field_worker','9423','o'], ARRAY['qa_ngo_us_acct','9423','am'],
    ARRAY['qa_ngo_eu_owner','9424','a'], ARRAY['qa_ngo_eu_manager','9424','m'],
    ARRAY['qa_ngo_eu_field_worker','9424','o'], ARRAY['qa_ngo_eu_acct','9424','am'],
    ARRAY['qa_ngo_sg_owner','9425','a'], ARRAY['qa_ngo_sg_manager','9425','m'],
    ARRAY['qa_ngo_sg_field_worker','9425','o'], ARRAY['qa_ngo_sg_acct','9425','am'],
    ARRAY['qa_ngo_au_owner','9426','a'], ARRAY['qa_ngo_au_manager','9426','m'],
    ARRAY['qa_ngo_au_field_worker','9426','o'], ARRAY['qa_ngo_au_acct','9426','am'],
    -- ── NIDHI enterprise 9500 ─────────────────────────────────────────────
    ARRAY['qa_ndh_owner','9500','a'], ARRAY['qa_ndh_manager','9500','m'],
    ARRAY['qa_ndh_collector','9500','o'], ARRAY['qa_ndh_loan_officer','9500','o'],
    ARRAY['qa_ndh_acct','9500','am'], ARRAY['qa_ndh_hr','9500','o'],
    ARRAY['qa_ndh_mis','9500','r'],   ARRAY['qa_ndh_audit','9500','r'],
    ARRAY['qa_ndh_s_owner','9520','a'], ARRAY['qa_ndh_s_manager','9520','m'],
    ARRAY['qa_ndh_s_collector','9520','o'],
    ARRAY['qa_ndh_p_owner','9521','a'], ARRAY['qa_ndh_p_manager','9521','m'],
    ARRAY['qa_ndh_p_collector','9521','o'], ARRAY['qa_ndh_p_acct','9521','am'],
    ARRAY['qa_ndh_p_mis','9521','r'],
    ARRAY['qa_ndh_ae_owner','9522','a'], ARRAY['qa_ndh_ae_manager','9522','m'],
    ARRAY['qa_ndh_ae_collector','9522','o'], ARRAY['qa_ndh_ae_acct','9522','am'],
    ARRAY['qa_ndh_us_owner','9523','a'], ARRAY['qa_ndh_us_manager','9523','m'],
    ARRAY['qa_ndh_us_collector','9523','o'], ARRAY['qa_ndh_us_acct','9523','am'],
    ARRAY['qa_ndh_eu_owner','9524','a'], ARRAY['qa_ndh_eu_manager','9524','m'],
    ARRAY['qa_ndh_eu_collector','9524','o'], ARRAY['qa_ndh_eu_acct','9524','am'],
    ARRAY['qa_ndh_sg_owner','9525','a'], ARRAY['qa_ndh_sg_manager','9525','m'],
    ARRAY['qa_ndh_sg_collector','9525','o'], ARRAY['qa_ndh_sg_acct','9525','am'],
    ARRAY['qa_ndh_au_owner','9526','a'], ARRAY['qa_ndh_au_manager','9526','m'],
    ARRAY['qa_ndh_au_collector','9526','o'], ARRAY['qa_ndh_au_acct','9526','am'],
    -- ── CRM enterprise 9600 ───────────────────────────────────────────────
    ARRAY['qa_crm_owner','9600','a'], ARRAY['qa_crm_manager','9600','m'],
    ARRAY['qa_crm_sales_exec','9600','o'], ARRAY['qa_crm_support','9600','o'],
    ARRAY['qa_crm_acct','9600','am'], ARRAY['qa_crm_hr','9600','o'],
    ARRAY['qa_crm_mis','9600','r'],   ARRAY['qa_crm_mkt','9600','o'],
    ARRAY['qa_crm_s_owner','9620','a'], ARRAY['qa_crm_s_sales_exec','9620','o'],
    ARRAY['qa_crm_s_support','9620','o'],
    ARRAY['qa_crm_p_owner','9621','a'], ARRAY['qa_crm_p_manager','9621','m'],
    ARRAY['qa_crm_p_sales_exec','9621','o'], ARRAY['qa_crm_p_acct','9621','am'],
    ARRAY['qa_crm_p_mis','9621','r'],
    ARRAY['qa_crm_ae_owner','9622','a'], ARRAY['qa_crm_ae_manager','9622','m'],
    ARRAY['qa_crm_ae_sales_exec','9622','o'], ARRAY['qa_crm_ae_acct','9622','am'],
    ARRAY['qa_crm_us_owner','9623','a'], ARRAY['qa_crm_us_manager','9623','m'],
    ARRAY['qa_crm_us_sales_exec','9623','o'], ARRAY['qa_crm_us_acct','9623','am'],
    ARRAY['qa_crm_eu_owner','9624','a'], ARRAY['qa_crm_eu_manager','9624','m'],
    ARRAY['qa_crm_eu_sales_exec','9624','o'], ARRAY['qa_crm_eu_acct','9624','am'],
    ARRAY['qa_crm_sg_owner','9625','a'], ARRAY['qa_crm_sg_manager','9625','m'],
    ARRAY['qa_crm_sg_sales_exec','9625','o'], ARRAY['qa_crm_sg_acct','9625','am'],
    ARRAY['qa_crm_au_owner','9626','a'], ARRAY['qa_crm_au_manager','9626','m'],
    ARRAY['qa_crm_au_sales_exec','9626','o'], ARRAY['qa_crm_au_acct','9626','am'],
    -- ── LOGISTICS enterprise 9700 ─────────────────────────────────────────
    ARRAY['qa_lgs_owner','9700','a'], ARRAY['qa_lgs_manager','9700','m'],
    ARRAY['qa_lgs_dispatcher','9700','o'], ARRAY['qa_lgs_driver','9700','o'],
    ARRAY['qa_lgs_acct','9700','am'], ARRAY['qa_lgs_hr','9700','o'],
    ARRAY['qa_lgs_crm','9700','o'],   ARRAY['qa_lgs_sales','9700','o'],
    ARRAY['qa_lgs_mis','9700','r'],   ARRAY['qa_lgs_wh','9700','o'],
    ARRAY['qa_lgs_prod','9700','o'],  ARRAY['qa_lgs_assets','9700','o'],
    ARRAY['qa_lgs_s_owner','9720','a'], ARRAY['qa_lgs_s_manager','9720','m'],
    ARRAY['qa_lgs_s_dispatcher','9720','o'], ARRAY['qa_lgs_s_billing','9720','am'],
    ARRAY['qa_lgs_p_owner','9721','a'], ARRAY['qa_lgs_p_manager','9721','m'],
    ARRAY['qa_lgs_p_dispatcher','9721','o'], ARRAY['qa_lgs_p_acct','9721','am'],
    ARRAY['qa_lgs_p_hr','9721','o'], ARRAY['qa_lgs_p_crm','9721','o'], ARRAY['qa_lgs_p_mis','9721','r'],
    ARRAY['qa_lgs_ae_owner','9722','a'], ARRAY['qa_lgs_ae_manager','9722','m'],
    ARRAY['qa_lgs_ae_dispatcher','9722','o'], ARRAY['qa_lgs_ae_acct','9722','am'],
    ARRAY['qa_lgs_us_owner','9723','a'], ARRAY['qa_lgs_us_manager','9723','m'],
    ARRAY['qa_lgs_us_dispatcher','9723','o'], ARRAY['qa_lgs_us_acct','9723','am'],
    ARRAY['qa_lgs_eu_owner','9724','a'], ARRAY['qa_lgs_eu_manager','9724','m'],
    ARRAY['qa_lgs_eu_dispatcher','9724','o'], ARRAY['qa_lgs_eu_acct','9724','am'],
    ARRAY['qa_lgs_sg_owner','9725','a'], ARRAY['qa_lgs_sg_manager','9725','m'],
    ARRAY['qa_lgs_sg_dispatcher','9725','o'], ARRAY['qa_lgs_sg_acct','9725','am'],
    ARRAY['qa_lgs_au_owner','9726','a'], ARRAY['qa_lgs_au_manager','9726','m'],
    ARRAY['qa_lgs_au_dispatcher','9726','o'], ARRAY['qa_lgs_au_acct','9726','am'],
    -- ── REAL ESTATE enterprise 9800 ───────────────────────────────────────
    ARRAY['qa_re_owner','9800','a'], ARRAY['qa_re_manager','9800','m'],
    ARRAY['qa_re_sales_exec','9800','o'], ARRAY['qa_re_site_engineer','9800','o'],
    ARRAY['qa_re_acct','9800','am'], ARRAY['qa_re_hr','9800','o'],
    ARRAY['qa_re_crm','9800','o'],   ARRAY['qa_re_sales','9800','o'],
    ARRAY['qa_re_mis','9800','r'],   ARRAY['qa_re_wh','9800','o'],
    ARRAY['qa_re_prod','9800','o'],  ARRAY['qa_re_assets','9800','o'],
    ARRAY['qa_re_s_owner','9820','a'], ARRAY['qa_re_s_manager','9820','m'],
    ARRAY['qa_re_s_sales_exec','9820','o'], ARRAY['qa_re_s_billing','9820','am'],
    ARRAY['qa_re_p_owner','9821','a'], ARRAY['qa_re_p_manager','9821','m'],
    ARRAY['qa_re_p_sales_exec','9821','o'], ARRAY['qa_re_p_acct','9821','am'],
    ARRAY['qa_re_p_hr','9821','o'], ARRAY['qa_re_p_crm','9821','o'], ARRAY['qa_re_p_mis','9821','r'],
    ARRAY['qa_re_ae_owner','9822','a'], ARRAY['qa_re_ae_manager','9822','m'],
    ARRAY['qa_re_ae_sales_exec','9822','o'], ARRAY['qa_re_ae_acct','9822','am'],
    ARRAY['qa_re_us_owner','9823','a'], ARRAY['qa_re_us_manager','9823','m'],
    ARRAY['qa_re_us_sales_exec','9823','o'], ARRAY['qa_re_us_acct','9823','am'],
    ARRAY['qa_re_eu_owner','9824','a'], ARRAY['qa_re_eu_manager','9824','m'],
    ARRAY['qa_re_eu_sales_exec','9824','o'], ARRAY['qa_re_eu_acct','9824','am'],
    ARRAY['qa_re_sg_owner','9825','a'], ARRAY['qa_re_sg_manager','9825','m'],
    ARRAY['qa_re_sg_sales_exec','9825','o'], ARRAY['qa_re_sg_acct','9825','am'],
    ARRAY['qa_re_au_owner','9826','a'], ARRAY['qa_re_au_manager','9826','m'],
    ARRAY['qa_re_au_sales_exec','9826','o'], ARRAY['qa_re_au_acct','9826','am'],
    -- ── AGRICULTURE enterprise 9900 ───────────────────────────────────────
    ARRAY['qa_agr_e_owner','9900','a'], ARRAY['qa_agr_e_manager','9900','m'],
    ARRAY['qa_agr_e_super','9900','o'], ARRAY['qa_agr_e_qc','9900','r'],
    ARRAY['qa_agr_e_acct','9900','am'], ARRAY['qa_agr_e_hr','9900','o'],
    ARRAY['qa_agr_e_mis','9900','r'],   ARRAY['qa_agr_e_crm','9900','o'],
    ARRAY['qa_agr_e_wh','9900','o'],
    ARRAY['qa_agr_s_owner','9920','a'], ARRAY['qa_agr_s_manager','9920','m'],
    ARRAY['qa_agr_s_super','9920','o'],
    ARRAY['qa_agr_p_owner','9921','a'], ARRAY['qa_agr_p_manager','9921','m'],
    ARRAY['qa_agr_p_acct','9921','am'],
    ARRAY['qa_agr_ae_owner','9922','a'], ARRAY['qa_agr_ae_manager','9922','m'],
    ARRAY['qa_agr_ae_supervisor','9922','o'], ARRAY['qa_agr_ae_acct','9922','am'],
    ARRAY['qa_agr_us_owner','9923','a'], ARRAY['qa_agr_us_manager','9923','m'],
    ARRAY['qa_agr_us_supervisor','9923','o'], ARRAY['qa_agr_us_acct','9923','am'],
    ARRAY['qa_agr_eu_owner','9924','a'], ARRAY['qa_agr_eu_manager','9924','m'],
    ARRAY['qa_agr_eu_supervisor','9924','o'], ARRAY['qa_agr_eu_acct','9924','am'],
    ARRAY['qa_agr_sg_owner','9925','a'], ARRAY['qa_agr_sg_manager','9925','m'],
    ARRAY['qa_agr_sg_supervisor','9925','o'], ARRAY['qa_agr_sg_acct','9925','am'],
    ARRAY['qa_agr_au_owner','9926','a'], ARRAY['qa_agr_au_manager','9926','m'],
    ARRAY['qa_agr_au_supervisor','9926','o'], ARRAY['qa_agr_au_acct','9926','am'],
    -- ── EDUCATION enterprise 9950 ─────────────────────────────────────────
    ARRAY['qa_edu_e_owner','9950','a'], ARRAY['qa_edu_e_admin','9950','m'],
    ARRAY['qa_edu_e_fee','9950','o'],   ARRAY['qa_edu_e_teacher','9950','o'],
    ARRAY['qa_edu_e_finance','9950','am'], ARRAY['qa_edu_e_exam','9950','o'],
    ARRAY['qa_edu_e_lib','9950','o'],   ARRAY['qa_edu_e_hr','9950','o'],
    ARRAY['qa_edu_e_mis','9950','r'],
    ARRAY['qa_edu_s_owner','9970','a'], ARRAY['qa_edu_s_admin','9970','m'],
    ARRAY['qa_edu_s_fee','9970','o'],
    ARRAY['qa_edu_p_owner','9971','a'], ARRAY['qa_edu_p_admin','9971','m'],
    ARRAY['qa_edu_p_finance','9971','am'],
    ARRAY['qa_edu_ae_owner','9972','a'], ARRAY['qa_edu_ae_principal','9972','m'],
    ARRAY['qa_edu_ae_fee_collector','9972','o'], ARRAY['qa_edu_ae_acct','9972','am'],
    ARRAY['qa_edu_us_owner','9973','a'], ARRAY['qa_edu_us_principal','9973','m'],
    ARRAY['qa_edu_us_fee_collector','9973','o'], ARRAY['qa_edu_us_acct','9973','am'],
    ARRAY['qa_edu_eu_owner','9974','a'], ARRAY['qa_edu_eu_principal','9974','m'],
    ARRAY['qa_edu_eu_fee_collector','9974','o'], ARRAY['qa_edu_eu_acct','9974','am'],
    ARRAY['qa_edu_sg_owner','9975','a'], ARRAY['qa_edu_sg_principal','9975','m'],
    ARRAY['qa_edu_sg_fee_collector','9975','o'], ARRAY['qa_edu_sg_acct','9975','am'],
    ARRAY['qa_edu_au_owner','9976','a'], ARRAY['qa_edu_au_principal','9976','m'],
    ARRAY['qa_edu_au_fee_collector','9976','o'], ARRAY['qa_edu_au_acct','9976','am'],
    -- ── GOLD enterprise 8000 ──────────────────────────────────────────────
    ARRAY['qa_gld_owner','8000','a'],   ARRAY['qa_gld_manager','8000','m'],
    ARRAY['qa_gld_cashier','8000','o'], ARRAY['qa_gld_acct','8000','am'],
    ARRAY['qa_gld_ae_owner','8022','a'], ARRAY['qa_gld_ae_manager','8022','m'],
    ARRAY['qa_gld_ae_sales_staff','8022','o'], ARRAY['qa_gld_ae_acct','8022','am'],
    ARRAY['qa_gld_us_owner','8023','a'], ARRAY['qa_gld_us_manager','8023','m'],
    ARRAY['qa_gld_us_sales_staff','8023','o'], ARRAY['qa_gld_us_acct','8023','am'],
    ARRAY['qa_gld_eu_owner','8024','a'], ARRAY['qa_gld_eu_manager','8024','m'],
    ARRAY['qa_gld_eu_sales_staff','8024','o'], ARRAY['qa_gld_eu_acct','8024','am'],
    ARRAY['qa_gld_sg_owner','8025','a'], ARRAY['qa_gld_sg_manager','8025','m'],
    ARRAY['qa_gld_sg_sales_staff','8025','o'], ARRAY['qa_gld_sg_acct','8025','am'],
    ARRAY['qa_gld_au_owner','8026','a'], ARRAY['qa_gld_au_manager','8026','m'],
    ARRAY['qa_gld_au_sales_staff','8026','o'], ARRAY['qa_gld_au_acct','8026','am'],
    -- ── RETAIL enterprise 8100 ────────────────────────────────────────────
    ARRAY['qa_rtl_owner','8100','a'], ARRAY['qa_rtl_manager','8100','m'],
    ARRAY['qa_rtl_cashier','8100','o'], ARRAY['qa_rtl_stock_clerk','8100','o'],
    ARRAY['qa_rtl_acct','8100','am'], ARRAY['qa_rtl_hr','8100','o'],
    ARRAY['qa_rtl_crm','8100','o'],   ARRAY['qa_rtl_sales','8100','o'],
    ARRAY['qa_rtl_mis','8100','r'],   ARRAY['qa_rtl_wh','8100','o'],
    ARRAY['qa_rtl_prod','8100','o'],  ARRAY['qa_rtl_assets','8100','o'],
    ARRAY['qa_rtl_s_owner','8120','a'], ARRAY['qa_rtl_s_manager','8120','m'],
    ARRAY['qa_rtl_s_cashier','8120','o'], ARRAY['qa_rtl_s_billing','8120','am'],
    ARRAY['qa_rtl_p_owner','8121','a'], ARRAY['qa_rtl_p_manager','8121','m'],
    ARRAY['qa_rtl_p_cashier','8121','o'], ARRAY['qa_rtl_p_acct','8121','am'],
    ARRAY['qa_rtl_p_hr','8121','o'], ARRAY['qa_rtl_p_crm','8121','o'], ARRAY['qa_rtl_p_mis','8121','r'],
    ARRAY['qa_rtl_ae_owner','8122','a'], ARRAY['qa_rtl_ae_manager','8122','m'],
    ARRAY['qa_rtl_ae_cashier','8122','o'], ARRAY['qa_rtl_ae_acct','8122','am'],
    ARRAY['qa_rtl_us_owner','8123','a'], ARRAY['qa_rtl_us_manager','8123','m'],
    ARRAY['qa_rtl_us_cashier','8123','o'], ARRAY['qa_rtl_us_acct','8123','am'],
    ARRAY['qa_rtl_eu_owner','8124','a'], ARRAY['qa_rtl_eu_manager','8124','m'],
    ARRAY['qa_rtl_eu_cashier','8124','o'], ARRAY['qa_rtl_eu_acct','8124','am'],
    ARRAY['qa_rtl_sg_owner','8125','a'], ARRAY['qa_rtl_sg_manager','8125','m'],
    ARRAY['qa_rtl_sg_cashier','8125','o'], ARRAY['qa_rtl_sg_acct','8125','am'],
    ARRAY['qa_rtl_au_owner','8126','a'], ARRAY['qa_rtl_au_manager','8126','m'],
    ARRAY['qa_rtl_au_cashier','8126','o'], ARRAY['qa_rtl_au_acct','8126','am'],
    -- ── MANUFACTURING enterprise 8200 ─────────────────────────────────────
    ARRAY['qa_mfg_owner','8200','a'], ARRAY['qa_mfg_manager','8200','m'],
    ARRAY['qa_mfg_operator','8200','o'], ARRAY['qa_mfg_qc','8200','r'],
    ARRAY['qa_mfg_acct','8200','am'], ARRAY['qa_mfg_hr','8200','o'],
    ARRAY['qa_mfg_mis','8200','r'],   ARRAY['qa_mfg_store','8200','o'],
    ARRAY['qa_mfg_planner','8200','o'],
    ARRAY['qa_mfg_s_owner','8220','a'], ARRAY['qa_mfg_s_manager','8220','m'],
    ARRAY['qa_mfg_s_operator','8220','o'], ARRAY['qa_mfg_s_billing','8220','am'],
    ARRAY['qa_mfg_s_purchase','8220','o'],
    ARRAY['qa_mfg_p_owner','8221','a'], ARRAY['qa_mfg_p_manager','8221','m'],
    ARRAY['qa_mfg_p_operator','8221','o'], ARRAY['qa_mfg_p_acct','8221','am'],
    ARRAY['qa_mfg_p_mis','8221','r'],
    ARRAY['qa_mfg_ae_owner','8222','a'], ARRAY['qa_mfg_ae_manager','8222','m'],
    ARRAY['qa_mfg_ae_operator','8222','o'], ARRAY['qa_mfg_ae_acct','8222','am'],
    ARRAY['qa_mfg_us_owner','8223','a'], ARRAY['qa_mfg_us_manager','8223','m'],
    ARRAY['qa_mfg_us_operator','8223','o'], ARRAY['qa_mfg_us_acct','8223','am'],
    ARRAY['qa_mfg_eu_owner','8224','a'], ARRAY['qa_mfg_eu_manager','8224','m'],
    ARRAY['qa_mfg_eu_operator','8224','o'], ARRAY['qa_mfg_eu_acct','8224','am'],
    ARRAY['qa_mfg_sg_owner','8225','a'], ARRAY['qa_mfg_sg_manager','8225','m'],
    ARRAY['qa_mfg_sg_operator','8225','o'], ARRAY['qa_mfg_sg_acct','8225','am'],
    ARRAY['qa_mfg_au_owner','8226','a'], ARRAY['qa_mfg_au_manager','8226','m'],
    ARRAY['qa_mfg_au_operator','8226','o'], ARRAY['qa_mfg_au_acct','8226','am'],
    -- ── FINANCE enterprise 8300 ───────────────────────────────────────────
    ARRAY['qa_fin_owner','8300','a'], ARRAY['qa_fin_cfo','8300','m'],
    ARRAY['qa_fin_accountant','8300','o'], ARRAY['qa_fin_ap_clerk','8300','o'],
    ARRAY['qa_fin_ar_clerk','8300','o'], ARRAY['qa_fin_acct','8300','am'],
    ARRAY['qa_fin_hr','8300','o'],    ARRAY['qa_fin_crm','8300','o'],
    ARRAY['qa_fin_sales','8300','o'], ARRAY['qa_fin_mis','8300','r'],
    ARRAY['qa_fin_wh','8300','o'],    ARRAY['qa_fin_assets','8300','o'],
    ARRAY['qa_fin_s_owner','8320','a'], ARRAY['qa_fin_s_accountant','8320','o'],
    ARRAY['qa_fin_s_billing','8320','am'],
    ARRAY['qa_fin_p_owner','8321','a'], ARRAY['qa_fin_p_cfo','8321','m'],
    ARRAY['qa_fin_p_accountant','8321','o'], ARRAY['qa_fin_p_acct','8321','am'],
    ARRAY['qa_fin_p_hr','8321','o'], ARRAY['qa_fin_p_crm','8321','o'], ARRAY['qa_fin_p_mis','8321','r'],
    ARRAY['qa_fin_ae_owner','8322','a'], ARRAY['qa_fin_ae_cfo','8322','m'],
    ARRAY['qa_fin_ae_accountant','8322','o'], ARRAY['qa_fin_ae_acct','8322','am'],
    ARRAY['qa_fin_us_owner','8323','a'], ARRAY['qa_fin_us_cfo','8323','m'],
    ARRAY['qa_fin_us_accountant','8323','o'], ARRAY['qa_fin_us_acct','8323','am'],
    ARRAY['qa_fin_eu_owner','8324','a'], ARRAY['qa_fin_eu_cfo','8324','m'],
    ARRAY['qa_fin_eu_accountant','8324','o'], ARRAY['qa_fin_eu_acct','8324','am'],
    ARRAY['qa_fin_sg_owner','8325','a'], ARRAY['qa_fin_sg_cfo','8325','m'],
    ARRAY['qa_fin_sg_accountant','8325','o'], ARRAY['qa_fin_sg_acct','8325','am'],
    ARRAY['qa_fin_au_owner','8326','a'], ARRAY['qa_fin_au_cfo','8326','m'],
    ARRAY['qa_fin_au_accountant','8326','o'], ARRAY['qa_fin_au_acct','8326','am'],
    -- ── ECOMMERCE enterprise 8400 ─────────────────────────────────────────
    ARRAY['qa_eco_owner','8400','a'], ARRAY['qa_eco_manager','8400','m'],
    ARRAY['qa_eco_ops','8400','o'],   ARRAY['qa_eco_catalog','8400','o'],
    ARRAY['qa_eco_acct','8400','am'], ARRAY['qa_eco_hr','8400','o'],
    ARRAY['qa_eco_crm','8400','o'],   ARRAY['qa_eco_sales','8400','o'],
    ARRAY['qa_eco_mis','8400','r'],   ARRAY['qa_eco_wh','8400','o'],
    ARRAY['qa_eco_prod','8400','o'],  ARRAY['qa_eco_assets','8400','o'],
    ARRAY['qa_eco_s_owner','8420','a'], ARRAY['qa_eco_s_ops','8420','o'],
    ARRAY['qa_eco_s_catalog','8420','o'], ARRAY['qa_eco_s_billing','8420','am'],
    ARRAY['qa_eco_p_owner','8421','a'], ARRAY['qa_eco_p_manager','8421','m'],
    ARRAY['qa_eco_p_ops','8421','o'], ARRAY['qa_eco_p_acct','8421','am'],
    ARRAY['qa_eco_p_hr','8421','o'], ARRAY['qa_eco_p_crm','8421','o'], ARRAY['qa_eco_p_mis','8421','r'],
    ARRAY['qa_eco_ae_owner','8422','a'], ARRAY['qa_eco_ae_manager','8422','m'],
    ARRAY['qa_eco_ae_ops','8422','o'], ARRAY['qa_eco_ae_acct','8422','am'],
    ARRAY['qa_eco_us_owner','8423','a'], ARRAY['qa_eco_us_manager','8423','m'],
    ARRAY['qa_eco_us_ops','8423','o'], ARRAY['qa_eco_us_acct','8423','am'],
    ARRAY['qa_eco_eu_owner','8424','a'], ARRAY['qa_eco_eu_manager','8424','m'],
    ARRAY['qa_eco_eu_ops','8424','o'], ARRAY['qa_eco_eu_acct','8424','am'],
    ARRAY['qa_eco_sg_owner','8425','a'], ARRAY['qa_eco_sg_manager','8425','m'],
    ARRAY['qa_eco_sg_ops','8425','o'], ARRAY['qa_eco_sg_acct','8425','am'],
    ARRAY['qa_eco_au_owner','8426','a'], ARRAY['qa_eco_au_manager','8426','m'],
    ARRAY['qa_eco_au_ops','8426','o'], ARRAY['qa_eco_au_acct','8426','am'],
    -- ── HR enterprise 8500 ────────────────────────────────────────────────
    ARRAY['qa_hr_owner','8500','a'], ARRAY['qa_hr_manager','8500','m'],
    ARRAY['qa_hr_recruiter','8500','o'], ARRAY['qa_hr_payroll_exec','8500','o'],
    ARRAY['qa_hr_acct','8500','am'], ARRAY['qa_hr_hr','8500','o'],
    ARRAY['qa_hr_crm','8500','o'],   ARRAY['qa_hr_sales','8500','o'],
    ARRAY['qa_hr_mis','8500','r'],   ARRAY['qa_hr_wh','8500','o'],
    ARRAY['qa_hr_prod','8500','o'],  ARRAY['qa_hr_assets','8500','o'],
    ARRAY['qa_hr_s_owner','8520','a'], ARRAY['qa_hr_s_manager','8520','m'],
    ARRAY['qa_hr_s_payroll_exec','8520','o'], ARRAY['qa_hr_s_billing','8520','am'],
    ARRAY['qa_hr_p_owner','8521','a'], ARRAY['qa_hr_p_manager','8521','m'],
    ARRAY['qa_hr_p_payroll_exec','8521','o'], ARRAY['qa_hr_p_acct','8521','am'],
    ARRAY['qa_hr_p_hr','8521','o'], ARRAY['qa_hr_p_crm','8521','o'], ARRAY['qa_hr_p_mis','8521','r'],
    ARRAY['qa_hr_ae_owner','8522','a'], ARRAY['qa_hr_ae_manager','8522','m'],
    ARRAY['qa_hr_ae_payroll_exec','8522','o'], ARRAY['qa_hr_ae_acct','8522','am'],
    ARRAY['qa_hr_us_owner','8523','a'], ARRAY['qa_hr_us_manager','8523','m'],
    ARRAY['qa_hr_us_payroll_exec','8523','o'], ARRAY['qa_hr_us_acct','8523','am'],
    ARRAY['qa_hr_eu_owner','8524','a'], ARRAY['qa_hr_eu_manager','8524','m'],
    ARRAY['qa_hr_eu_payroll_exec','8524','o'], ARRAY['qa_hr_eu_acct','8524','am'],
    ARRAY['qa_hr_sg_owner','8525','a'], ARRAY['qa_hr_sg_manager','8525','m'],
    ARRAY['qa_hr_sg_payroll_exec','8525','o'], ARRAY['qa_hr_sg_acct','8525','am'],
    ARRAY['qa_hr_au_owner','8526','a'], ARRAY['qa_hr_au_manager','8526','m'],
    ARRAY['qa_hr_au_payroll_exec','8526','o'], ARRAY['qa_hr_au_acct','8526','am']
  ];
  i INT;
  uname TEXT; tid INT; rc TEXT; rid TEXT; rname TEXT;
BEGIN
  FOR i IN 1..array_length(data, 1) LOOP
    uname := data[i][1];
    tid   := data[i][2]::INT;
    rc    := data[i][3];
    rid   := 'qa-r-' || tid || '-' || rc;
    rname := CASE rc
      WHEN 'a'  THEN 'admin'
      WHEN 'm'  THEN 'manager'
      WHEN 'o'  THEN 'operator'
      WHEN 'r'  THEN 'reviewer'
      WHEN 'am' THEN 'accountsmanager'
    END;
    BEGIN
      INSERT INTO users (id,username,password,email,first_name,last_name,role_id,role,tenant_id,record_status)
      VALUES (
        'qa-u-'||uname, uname, pw,
        uname||'@qa.kinto', 'QA', uname,
        rid, rname, tid, 1
      )
      ON CONFLICT (username) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'User % skipped: %', uname, SQLERRM;
    END;
  END LOOP;
END $$;
COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification
-- ─────────────────────────────────────────────────────────────────────────────
SELECT t.id, t.name, t.currency_code, t.tax_regime,
       COUNT(DISTINCT r.id) AS roles, COUNT(DISTINCT u.id) AS users
FROM tenants t
LEFT JOIN roles r ON r.tenant_id=t.id
LEFT JOIN users u ON u.tenant_id=t.id
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
