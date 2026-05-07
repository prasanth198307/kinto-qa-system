-- ============================================================
-- Gold ERP Phase 2: Gold Chit Scheme Completion
-- Priority: HIGH — most-used retail product for Indian jewellers
-- ============================================================

-- 1. Extend jw_chit_schemes with missing config fields
ALTER TABLE jw_chit_schemes
  ADD COLUMN IF NOT EXISTS bonus_type            VARCHAR(30) DEFAULT 'free_month',
  ADD COLUMN IF NOT EXISTS bonus_value           NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS joining_fee           NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS foreclosure_penalty_pct NUMERIC(5,2) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS late_fee              NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grace_days            INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS payment_modes         TEXT DEFAULT 'cash,upi,bank',
  ADD COLUMN IF NOT EXISTS instalment_day        INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS terms_conditions      TEXT,
  ADD COLUMN IF NOT EXISTS total_maturity_value  NUMERIC(12,2) DEFAULT 0;

-- 2. Extend jw_chit_members with KYC + maturity fields
ALTER TABLE jw_chit_members
  ADD COLUMN IF NOT EXISTS email              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS aadhaar_no         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS nominee_name       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nominee_relation   VARCHAR(40),
  ADD COLUMN IF NOT EXISTS bank_account       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS ifsc_code          VARCHAR(15),
  ADD COLUMN IF NOT EXISTS photo_url          TEXT,
  ADD COLUMN IF NOT EXISTS agreement_url      TEXT,
  ADD COLUMN IF NOT EXISTS maturity_date      DATE,
  ADD COLUMN IF NOT EXISTS maturity_value     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS defaulter_flag     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS months_defaulted   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_60_sent   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_30_sent   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_10_sent   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS branch             VARCHAR(60),
  ADD COLUMN IF NOT EXISTS enrolled_by        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS member_card_no     VARCHAR(40);

-- 3. Extend jw_chit_redemptions with full redemption details
ALTER TABLE jw_chit_redemptions
  ADD COLUMN IF NOT EXISTS total_paid            NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_amount          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_redeemable      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_tag_no           VARCHAR(60),
  ADD COLUMN IF NOT EXISTS making_charge_credit  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_payable       NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_deducted          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_amount         NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gold_rate_on_date     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS processed_by          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS settled               INTEGER DEFAULT 0;

-- 4. Defaulter Actions Log — follow-up history
CREATE TABLE IF NOT EXISTS jw_chit_defaulter_actions (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  member_id     INTEGER NOT NULL REFERENCES jw_chit_members(id) ON DELETE CASCADE,
  scheme_id     INTEGER NOT NULL REFERENCES jw_chit_schemes(id),
  action_date   DATE DEFAULT CURRENT_DATE,
  action_type   VARCHAR(30) NOT NULL,  -- call / whatsapp / visit / legal_notice / write_off
  response      TEXT,
  next_followup DATE,
  done_by       VARCHAR(100),
  resolved      INTEGER DEFAULT 0,
  resolution_type VARCHAR(30),         -- paid / foreclosed / written_off
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_defaulter_tenant ON jw_chit_defaulter_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_defaulter_member ON jw_chit_defaulter_actions(member_id);

-- 5. Maturity Reminders Log
CREATE TABLE IF NOT EXISTS jw_chit_maturity_reminders (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER NOT NULL,
  member_id    INTEGER NOT NULL REFERENCES jw_chit_members(id) ON DELETE CASCADE,
  scheme_id    INTEGER NOT NULL REFERENCES jw_chit_schemes(id),
  reminder_type VARCHAR(20) NOT NULL,   -- 60_days / 30_days / 10_days / matured
  sent_via     VARCHAR(20) DEFAULT 'whatsapp',
  sent_at      TIMESTAMPTZ DEFAULT NOW(),
  maturity_value NUMERIC(12,2)
);
CREATE INDEX IF NOT EXISTS idx_jw_mat_reminder_tenant ON jw_chit_maturity_reminders(tenant_id);
