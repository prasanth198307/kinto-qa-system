-- Gold ERP Schema Fixes — Issues 1, 2, 3 from validation review

-- Issue 1: jw_cad_process — remove duplicate columns
-- Keep: software_used (pos 7), approval_status (pos 14)
-- Remove: cad_software (duplicate of software_used), customer_approval (duplicate of approval_status)
ALTER TABLE jw_cad_process DROP COLUMN IF EXISTS cad_software;
ALTER TABLE jw_cad_process DROP COLUMN IF EXISTS customer_approval;

-- Issue 2: jw_chit_installments — support gm-based chit schemes
-- Rename amount → amount_inr; add amount_gm for gold-weight chit installments
ALTER TABLE jw_chit_installments RENAME COLUMN amount TO amount_inr;
ALTER TABLE jw_chit_installments ADD COLUMN IF NOT EXISTS amount_gm numeric;

-- Issue 3: jw_jewellery_pos_bills — link to loyalty program at billing time
ALTER TABLE jw_jewellery_pos_bills ADD COLUMN IF NOT EXISTS loyalty_member_id integer;
ALTER TABLE jw_jewellery_pos_bills ADD COLUMN IF NOT EXISTS loyalty_points_earned numeric DEFAULT 0;
ALTER TABLE jw_jewellery_pos_bills ADD COLUMN IF NOT EXISTS loyalty_points_redeemed numeric DEFAULT 0;
ALTER TABLE jw_jewellery_pos_bills ADD COLUMN IF NOT EXISTS loyalty_redemption_value numeric DEFAULT 0;

-- Issue 4 (compliance note — no DDL change):
-- jw_traces_config.section_code default '206C' needs CA review.
-- 206C = seller TDS collection at source; 194Q = buyer TDS deduction on gold purchase > ₹50L.
-- Confirm applicable section with your CA before building auto-deduction logic.
-- To update the default once confirmed:
-- ALTER TABLE jw_traces_config ALTER COLUMN section_code SET DEFAULT '194Q';
