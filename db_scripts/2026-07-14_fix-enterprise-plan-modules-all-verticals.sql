-- Fix subscription_plans module lists for all 17 vertical ERPs
-- Based on real-world enterprise ERP requirements per industry vertical
-- Rule: gatepasses only where physical goods movement control is needed
--       production only where goods are actually manufactured/assembled
--       warehouses only where multi-location stock is a real requirement

BEGIN;

-- ── 1. RESTAURANT ERP ────────────────────────────────────────────────────────
-- Restaurant needs: POS+kitchen+tables+menu+loyalty+aggregator+central kitchen+delivery
-- Does NOT need: gatepasses (no physical gate control), no traditional manufacturing
-- Has: production (central kitchen batch cooking / outlet dispatch)
UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","expenses","documents","restaurant","masters"]'::jsonb
WHERE slug = 'restaurant_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","restaurant","masters"]'::jsonb
WHERE slug = 'restaurant_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","production","warehouses","fixed_assets","multi_currency","projects","api_hub","restaurant","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'restaurant_enterprise';

-- ── 2. HOTEL ERP ─────────────────────────────────────────────────────────────
-- Hotel needs: front-desk+reservations+folio+housekeeping+night-audit+channel-manager+banquet
-- HAS restaurant module (hotel runs its own F&B outlet)
-- HAS gatepasses (vendor material check-in/check-out at hotel entrance — security requirement)
UPDATE subscription_plans SET modules = '["invoicing","expenses","documents","hotel","masters"]'::jsonb
WHERE slug = 'hotel_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","warehouses","api_hub","hotel","masters"]'::jsonb
WHERE slug = 'hotel_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","warehouses","fixed_assets","multi_currency","projects","api_hub","restaurant","hotel","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'hotel_enterprise';

-- ── 3. HEALTHCARE ERP ─────────────────────────────────────────────────────────
-- Healthcare needs: OPD+IPD+OT+lab+nursing+blood bank+ABDM+EMR+TPA+insurance
-- HAS pharmacy (hospital has its own dispensary)
-- NO gatepasses (hospitals don't need formal gate pass for internal operations)
UPDATE subscription_plans SET modules = '["invoicing","expenses","documents","healthcare","masters"]'::jsonb
WHERE slug = 'healthcare_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","pharmacy","healthcare","masters"]'::jsonb
WHERE slug = 'healthcare_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","pharmacy","fixed_assets","multi_currency","api_hub","healthcare","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'healthcare_enterprise';

-- ── 4. PHARMACY ERP ───────────────────────────────────────────────────────────
-- Pharmacy needs: FEFO billing + Schedule H/X + narcotics register + batch/expiry + e-invoice
-- HAS gatepasses (drug chain: controlled despatch from warehouse to branches is gate-pass governed)
-- HAS warehouses (chain pharmacy: central warehouse → branch dispatch)
UPDATE subscription_plans SET modules = '["invoicing","basic_inventory","expenses","documents","pharmacy","masters"]'::jsonb
WHERE slug = 'pharmacy_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","expenses","documents","accounting","mis","whatsapp","pharmacy","masters"]'::jsonb
WHERE slug = 'pharmacy_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","warehouses","fixed_assets","multi_currency","api_hub","pharmacy","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'pharmacy_enterprise';

-- ── 5. NGO ERP ────────────────────────────────────────────────────────────────
-- NGO needs: donor mgmt + 80G + FCRA + fund accounting + grants + beneficiaries + CSR
-- NO gatepasses, NO production, NO warehouses
UPDATE subscription_plans SET modules = '["invoicing","expenses","documents","ngo","masters"]'::jsonb
WHERE slug = 'ngo_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","expenses","documents","accounting","mis","whatsapp","ngo","masters"]'::jsonb
WHERE slug = 'ngo_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","fixed_assets","multi_currency","projects","approvals","api_hub","ngo","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'ngo_enterprise';

-- ── 6. NIDHI COMPANY ERP ─────────────────────────────────────────────────────
-- Nidhi needs: members + shares + FD/RD deposits + loans + EMI + PDC + mobile collection + RBI returns
-- NO gatepasses, NO production, NO warehouses (NBFC/Nidhi doesn't deal in physical goods)
UPDATE subscription_plans SET modules = '["invoicing","expenses","documents","nidhi","masters"]'::jsonb
WHERE slug = 'nidhi_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","expenses","documents","accounting","mis","whatsapp","nidhi","masters"]'::jsonb
WHERE slug = 'nidhi_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","fixed_assets","multi_currency","approvals","api_hub","nidhi","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'nidhi_enterprise';

-- ── 7. CRM ERP ────────────────────────────────────────────────────────────────
-- CRM needs: pipeline + leads + contacts + campaigns + email + WhatsApp + drip + quotations + telephony
-- NO gatepasses, NO production, NO warehouses (CRM is service/software vertical)
UPDATE subscription_plans SET modules = '["invoicing","expenses","crm","masters"]'::jsonb
WHERE slug = 'crm_starter';

UPDATE subscription_plans SET modules = '["invoicing","expenses","documents","accounting","mis","crm","whatsapp","api_hub","masters"]'::jsonb
WHERE slug = 'crm_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","multi_currency","projects","approvals","recurring_invoices","api_hub","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'crm_enterprise';

-- ── 8. LOGISTICS & TRANSPORT ERP ──────────────────────────────────────────────
-- Logistics needs: fleet + drivers + trips + e-way bill + ePOD + GPS + freight billing + route opt
-- HAS gatepasses (vehicle entry/exit at client warehouse, consignment gate slip)
-- NO production, NO manufacturing
UPDATE subscription_plans SET modules = '["invoicing","expenses","documents","logistics_transport","masters"]'::jsonb
WHERE slug = 'logistics_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","expenses","documents","accounting","mis","whatsapp","hr_payroll","logistics_transport","masters"]'::jsonb
WHERE slug = 'logistics_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","fixed_assets","multi_currency","api_hub","logistics_transport","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'logistics_enterprise';

-- ── 9. REAL ESTATE ERP ───────────────────────────────────────────────────────
-- Real estate needs: project+units+bookings+demand letters+collections+broker+RERA+construction+society
-- HAS gatepasses (construction site material gate control — mandatory for large projects)
-- NO production (no manufacturing)
UPDATE subscription_plans SET modules = '["invoicing","expenses","documents","real_estate","masters"]'::jsonb
WHERE slug = 'real_estate_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","real_estate","masters"]'::jsonb
WHERE slug = 'real_estate_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","fixed_assets","multi_currency","projects","approvals","api_hub","real_estate","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'real_estate_enterprise';

-- ── 10. AGRICULTURE ERP ──────────────────────────────────────────────────────
-- Agriculture needs: farms + crops + harvest + inputs + FPO + mandi prices + weather + PMFBY + traceability
-- HAS warehouses (grain storage, cold storage for FPO produce)
-- NO gatepasses (farms don't have formal gate pass systems)
UPDATE subscription_plans SET modules = '["invoicing","expenses","documents","agriculture","masters"]'::jsonb
WHERE slug = 'agriculture_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","expenses","documents","accounting","mis","whatsapp","agriculture","masters"]'::jsonb
WHERE slug = 'agriculture_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","warehouses","fixed_assets","multi_currency","api_hub","agriculture","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'agriculture_enterprise';

-- ── 11. EDUCATION ERP ─────────────────────────────────────────────────────────
-- Education needs: students + admissions + attendance + exams + fees + timetable + library + transport + hostel
-- NO gatepasses (schools/colleges don't use gate pass ERP modules)
-- NO production, NO warehouses
UPDATE subscription_plans SET modules = '["invoicing","expenses","documents","education","masters"]'::jsonb
WHERE slug = 'education_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","expenses","documents","accounting","mis","whatsapp","hr_payroll","education","masters"]'::jsonb
WHERE slug = 'education_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","fixed_assets","multi_currency","projects","api_hub","education","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'education_enterprise';

-- ── 12. GOLD ERP ──────────────────────────────────────────────────────────────
-- Gold needs: karigar + metal ledger + hallmarking + jewellery POS + buyback + vault + chit + bullion + SEBI
-- HAS gatepasses (precious metal movement gate pass — security/compliance requirement)
-- HAS production (karigar workshop: casting, setting, polishing)
-- HAS quality_returns (karigar rejection, customer returns)
UPDATE subscription_plans SET modules = '["invoicing","basic_inventory","expenses","documents","gold_erp","masters"]'::jsonb
WHERE slug = 'gold_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","production","quality_returns","gold_erp","masters"]'::jsonb
WHERE slug = 'gold_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","production","quality_returns","warehouses","fixed_assets","multi_currency","pos","api_hub","gold_erp","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'gold_enterprise';

-- ── 13. RETAIL / POS ERP ─────────────────────────────────────────────────────
-- Retail needs: POS + omni-channel + loyalty + franchise + B2B portal + store transfers
-- HAS gatepasses (retail chain: goods despatch from warehouse to stores, inter-store transfer control)
-- HAS quality_returns (sales returns, damaged goods)
UPDATE subscription_plans SET modules = '["invoicing","basic_inventory","expenses","pos","masters"]'::jsonb
WHERE slug = 'pos_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","accounting","mis","crm","whatsapp","pos","masters"]'::jsonb
WHERE slug = 'pos_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","warehouses","fixed_assets","multi_currency","quality_returns","api_hub","pos","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'pos_enterprise';

-- ── 14. MANUFACTURING ERP ─────────────────────────────────────────────────────
-- Manufacturing needs: BOM + work orders + MRP + job cards + sub-contracting + machine OEE + quality
-- HAS gatepasses (raw material in + finished goods out gate control — mandatory in factories)
-- HAS production, quality_returns, serial_lot, uom, warehouses etc.
UPDATE subscription_plans SET modules = '["invoicing","basic_inventory","expenses","documents","production","masters"]'::jsonb
WHERE slug = 'manufacturing_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","production","quality_returns","serial_lot","uom","masters"]'::jsonb
WHERE slug = 'manufacturing_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","production","quality_returns","warehouses","fixed_assets","multi_currency","projects","timesheets","serial_lot","uom","stock_transfers","purchase_requisitions","grn","price_lists","item_variants","approvals","maintenance","api_hub","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'manufacturing_enterprise';

-- ── 15. HR & PAYROLL ERP ──────────────────────────────────────────────────────
-- HR ERP needs: employees + attendance + leaves + payroll + recruitment + appraisals + exit + ESS
-- NO gatepasses, NO production, NO warehouses, NO invoicing (it's pure HR)
-- HAS accounting (salary GL posting), projects (project-based HR), timesheets, appraisals
UPDATE subscription_plans SET modules = '["hr_payroll","expenses","masters"]'::jsonb
WHERE slug = 'hr_starter';

UPDATE subscription_plans SET modules = '["hr_payroll","expenses","documents","mis","api_hub","masters"]'::jsonb
WHERE slug = 'hr_professional';

UPDATE subscription_plans SET modules = '["hr_payroll","expenses","documents","mis","accounting","projects","timesheets","appraisals","approvals","whatsapp","api_hub","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'hr_enterprise';

-- ── 16. E-COMMERCE ERP ───────────────────────────────────────────────────────
-- E-commerce needs: channel management + listings + orders + fulfilment + returns + settlements + inventory sync
-- HAS gatepasses (warehouse outward despatch gate control)
-- HAS pos (omni-channel: physical store + online)
-- HAS warehouses (multi-location fulfilment centres)
UPDATE subscription_plans SET modules = '["invoicing","basic_inventory","expenses","documents","ecommerce","masters"]'::jsonb
WHERE slug = 'ecommerce_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","expenses","documents","accounting","mis","whatsapp","api_hub","ecommerce","masters"]'::jsonb
WHERE slug = 'ecommerce_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","warehouses","fixed_assets","multi_currency","pos","api_hub","ecommerce","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'ecommerce_enterprise';

-- ── 17. FINANCE ERP ───────────────────────────────────────────────────────────
-- Finance ERP needs: full GL + AR + AP + bank reconciliation + fixed assets + budgeting + TDS + MIS
-- NO gatepasses (pure finance ERP has no physical goods movement)
-- NO production, NO warehouses, NO restaurant/hotel/vertical modules
UPDATE subscription_plans SET modules = '["invoicing","expenses","documents","accounting","masters"]'::jsonb
WHERE slug = 'finance_starter';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","expenses","documents","accounting","mis","crm","whatsapp","fixed_assets","masters"]'::jsonb
WHERE slug = 'finance_professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","sales_orders","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","fixed_assets","multi_currency","projects","timesheets","approvals","recurring_invoices","audit_trail","api_hub","masters","swachdesk","swachforms","swachmeet","swachsign","swachsocial"]'::jsonb
WHERE slug = 'finance_enterprise';

COMMIT;
