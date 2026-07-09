-- =============================================================================
-- CORRECTED SCREEN PERMISSIONS — 2026-07-09
-- Replaces 10 scripts that used wrong schema (role text / allowed_actions / action columns)
-- Correct schema: role_permissions(role_id FK→roles.id, screen_key, tenant_id,
--                  can_view INT, can_create INT, can_edit INT, can_delete INT)
-- Safe to re-run: ON CONFLICT (role_id, screen_key) DO NOTHING
-- =============================================================================

-- ── HELPER: single INSERT pattern ─────────────────────────────────────────────
-- Inserts permission rows for all roles matching given names, across all tenants
-- =============================================================================

-- ── 1. CRM Screen Permissions ─────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id,
  1,
  CASE WHEN lower(r.name) IN ('admin','manager','crm_manager','sales_rep','sales_manager') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager','crm_manager','sales_rep','sales_manager') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager','crm_manager') THEN 1 ELSE 0 END,
  1
FROM roles r
CROSS JOIN (VALUES
  ('crm_leads'), ('crm_pipeline'), ('crm_contacts'),
  ('crm_accounts'), ('crm_activities'), ('crm_quotations')
) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','crm_manager','sales_rep','sales_manager')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- CRM limited screens (view+create only)
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id, 1, 1, 0, 0, 1
FROM roles r
CROSS JOIN (VALUES
  ('crm_email_campaigns'), ('crm_whatsapp'), ('crm_telephony')
) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','crm_manager','sales_rep','sales_manager')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- CRM reports (view only)
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, 'crm_reports', r.tenant_id, 1, 0, 0, 0, 1
FROM roles r
WHERE lower(r.name) IN ('admin','manager','crm_manager','sales_rep','sales_manager')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = 'crm_reports');

-- ── 2. Healthcare Screen Permissions ──────────────────────────────────────────
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id,
  1,
  CASE WHEN lower(r.name) IN ('admin','manager','doctor') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager','doctor','nurse') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager') THEN 1 ELSE 0 END,
  1
FROM roles r
CROSS JOIN (VALUES
  ('healthcare_patients'), ('healthcare_doctors'), ('healthcare_opd'), ('healthcare_ipd'),
  ('healthcare_beds'), ('healthcare_ot'), ('healthcare_lab'), ('healthcare_nursing'),
  ('healthcare_blood_bank'), ('healthcare_insurance'), ('healthcare_abdm'),
  ('healthcare_emr'), ('healthcare_tpa_claims')
) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','doctor','nurse','lab_technician','pharmacist')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- Healthcare reports (view only)
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, 'healthcare_reports', r.tenant_id, 1, 0, 0, 0, 1
FROM roles r
WHERE lower(r.name) IN ('admin','manager','doctor','nurse','lab_technician','pharmacist')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = 'healthcare_reports');

-- ── 3. Hotel Screen Permissions ───────────────────────────────────────────────
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id,
  1,
  CASE WHEN lower(r.name) IN ('admin','manager','hotel_manager','receptionist') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager','hotel_manager','receptionist') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager','hotel_manager') THEN 1 ELSE 0 END,
  1
FROM roles r
CROSS JOIN (VALUES
  ('hotel'), ('hotel_rooms'), ('hotel_front_desk'), ('hotel_reservations'),
  ('hotel_checkin'), ('hotel_folio'), ('hotel_housekeeping'), ('hotel_rates'),
  ('hotel_corporate')
) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','hotel_manager','receptionist','housekeeping')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- Hotel night audit (view+create)
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, 'hotel_night_audit', r.tenant_id, 1, 1, 0, 0, 1
FROM roles r
WHERE lower(r.name) IN ('admin','manager','hotel_manager','receptionist','housekeeping')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = 'hotel_night_audit');

-- Hotel reports (view only)
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, 'hotel_reports', r.tenant_id, 1, 0, 0, 0, 1
FROM roles r
WHERE lower(r.name) IN ('admin','manager','hotel_manager','receptionist','housekeeping')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = 'hotel_reports');

-- ── 4. HR Biometric Screen Permissions ────────────────────────────────────────
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, 'hr_biometric', r.tenant_id,
  1,
  CASE WHEN lower(r.name) IN ('admin','manager','hr_manager','hr_admin') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager','hr_manager','hr_admin') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','hr_admin') THEN 1 ELSE 0 END,
  1
FROM roles r
WHERE lower(r.name) IN ('admin','manager','hr_manager','hr_admin','payroll_officer')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = 'hr_biometric');

-- HR limited screens (EPFO, offer letters — view+create)
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id, 1, 1, 0, 0, 1
FROM roles r
CROSS JOIN (VALUES ('hr_epfo_filing'), ('hr_offer_letters')) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','hr_manager','hr_admin','payroll_officer')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- ── 5. Finance Advanced Screen Permissions ────────────────────────────────────
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id, 1, 1, 1,
  CASE WHEN lower(r.name) IN ('admin','manager','cfo') THEN 1 ELSE 0 END,
  1
FROM roles r
CROSS JOIN (VALUES
  ('finance_recurring_journals'), ('finance_consolidation'),
  ('finance_ifrs_gaap'), ('finance_investor_reporting')
) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','finance_manager','accountant','cfo','superadmin')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- Finance limited screens (view+create)
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id, 1, 1, 0, 0, 1
FROM roles r
CROSS JOIN (VALUES ('finance_zatca'), ('finance_gstr_direct')) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','finance_manager','accountant','cfo','superadmin')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- ── 6. Gold ERP New Screen Permissions ────────────────────────────────────────
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id, 1,
  CASE WHEN sk.screen_key != 'gold_erp_live_rates' THEN 1 ELSE 0 END,
  CASE WHEN sk.screen_key != 'gold_erp_live_rates' THEN 1 ELSE 0 END,
  0, 1
FROM roles r
CROSS JOIN (VALUES
  ('gold_erp_live_rates'), ('gold_erp_sebi_reporting'), ('gold_erp_digital_gold')
) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','superadmin','jewellery_manager','jeweller')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- Gold limited (view/create only for billing_staff, store_keeper)
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id, 1,
  CASE WHEN sk.screen_key = 'gold_erp_digital_gold' THEN 1 ELSE 0 END,
  0, 0, 1
FROM roles r
CROSS JOIN (VALUES ('gold_erp_live_rates'), ('gold_erp_digital_gold')) AS sk(screen_key)
WHERE lower(r.name) IN ('billing_staff','store_keeper','operator')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- ── 7. Manufacturing New Screen Permissions ───────────────────────────────────
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id, 1, 1, 1,
  CASE WHEN lower(r.name) IN ('admin','manager','superadmin') THEN 1 ELSE 0 END,
  1
FROM roles r
CROSS JOIN (VALUES
  ('manufacturing_barcode'), ('manufacturing_pm'),
  ('manufacturing_bom_versions'), ('manufacturing_supply_chain')
) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','superadmin','production_manager','store_manager','maintenance_engineer')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- Manufacturing operators (view only for PM, view+create for barcode/supply_chain)
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id, 1,
  CASE WHEN sk.screen_key = 'manufacturing_pm' THEN 0 ELSE 1 END,
  0, 0, 1
FROM roles r
CROSS JOIN (VALUES
  ('manufacturing_barcode'), ('manufacturing_pm'), ('manufacturing_supply_chain')
) AS sk(screen_key)
WHERE lower(r.name) IN ('operator','warehouse_staff','store_keeper')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- ── 8. NGO Screen Permissions ─────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id,
  1,
  CASE WHEN lower(r.name) IN ('admin','manager','operator') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) = 'admin' THEN 1 ELSE 0 END,
  1
FROM roles r
CROSS JOIN (VALUES
  ('ngo_donors'), ('ngo_donations'), ('ngo_80g'), ('ngo_80g_bulk'),
  ('ngo_projects'), ('ngo_beneficiaries'), ('ngo_grants'), ('ngo_volunteers'),
  ('ngo_fcra'), ('ngo_csr'), ('ngo_funds'), ('ngo_donor_admin'), ('ngo_reports')
) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','operator')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- ── 9. Nidhi Company Screen Permissions ───────────────────────────────────────
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id,
  1,
  CASE WHEN lower(r.name) IN ('admin','manager','operator') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) = 'admin' THEN 1 ELSE 0 END,
  1
FROM roles r
CROSS JOIN (VALUES
  ('nidhi_members'), ('nidhi_deposits'), ('nidhi_loans'), ('nidhi_emi'),
  ('nidhi_shares'), ('nidhi_gold_rates'), ('nidhi_interest_rates'),
  ('nidhi_daily_collection'), ('nidhi_compliance'), ('nidhi_reports'),
  ('nidhi_loan_sanction'), ('nidhi_pdc_tracking'), ('nidhi_rbi_returns'),
  ('nidhi_member_passbook'), ('nidhi_mobile_collection')
) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','operator')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- Nidhi agent: mobile collection only
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, 'nidhi_mobile_collection', r.tenant_id, 1, 1, 0, 0, 1
FROM roles r
WHERE lower(r.name) = 'agent'
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = 'nidhi_mobile_collection');

-- ── 10. Restaurant ONDC + Loyalty Screen Permissions ─────────────────────────
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id, 1, 1, 1,
  CASE WHEN lower(r.name) IN ('admin','manager','superadmin') THEN 1 ELSE 0 END,
  1
FROM roles r
CROSS JOIN (VALUES ('restaurant_ondc'), ('restaurant_loyalty_expiry')) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','superadmin','restaurant_manager')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- ONDC view only for cashier/billing_staff/operator
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, 'restaurant_ondc', r.tenant_id, 1, 0, 0, 0, 1
FROM roles r
WHERE lower(r.name) IN ('cashier','billing_staff','operator')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = 'restaurant_ondc');

-- ── 11. Retail/POS Advanced Screen Permissions ────────────────────────────────
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id,
  1,
  CASE WHEN lower(r.name) IN ('admin','manager','operator') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) = 'admin' THEN 1 ELSE 0 END,
  1
FROM roles r
CROSS JOIN (VALUES
  ('retail_franchise'), ('retail_b2b_portal'), ('retail_store_transfers'),
  ('retail_loyalty'), ('retail_omni_channel'), ('retail_pos_hardware')
) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','operator')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

-- ── 12. Extended App Suite Screen Permissions ─────────────────────────────────
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id, 1, 1, 1,
  CASE WHEN lower(r.name) = 'admin' THEN 1 ELSE 0 END,
  1
FROM roles r
CROSS JOIN (VALUES ('swachsign'), ('swachmeet'), ('swachsocial')) AS sk(screen_key)
WHERE lower(r.name) IN ('admin','manager','operator')
  AND r.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key);

SELECT 'All corrected screen permissions applied successfully' AS result;
