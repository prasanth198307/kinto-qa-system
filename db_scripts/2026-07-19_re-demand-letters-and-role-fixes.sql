-- Real Estate ERP: create re_demand_letters table + fix alias user roles

-- 1. re_demand_letters table
CREATE TABLE IF NOT EXISTS re_demand_letters (
  id            TEXT        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     TEXT        NOT NULL,
  demand_number VARCHAR(50),
  booking_id    TEXT,
  customer_name TEXT,
  unit_number   TEXT,
  demand_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date      DATE,
  milestone     TEXT,
  amount        NUMERIC(15,2) DEFAULT 0,
  paid_amount   NUMERIC(15,2) DEFAULT 0,
  status        TEXT        DEFAULT 'pending',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Fix alias user roles so tests match expected roles
-- qa_re_site_engineer → reviewer  (test expects 'reviewer')
UPDATE users SET role='reviewer'     WHERE username='qa_re_site_engineer' AND role='operator';
-- qa_re_sales        → manager     (test: sales manager)
UPDATE users SET role='manager'      WHERE username='qa_re_sales'         AND role='operator';
-- qa_re_crm          → operator    (already operator — no change)
-- qa_re_hr           → operator    (specialist — already operator)
-- qa_re_mis          → reviewer    (read-only — already reviewer via seed; verify)
UPDATE users SET role='reviewer'     WHERE username='qa_re_mis'           AND role='operator';
-- qa_re_wh           → operator    (warehouse — already operator)
-- qa_re_prod         → operator    (production — already operator)
-- qa_re_assets       → operator    (assets — already operator)

-- 3. Verify re_units table has no current_price column (routes reference it)
ALTER TABLE re_units ADD COLUMN IF NOT EXISTS current_price NUMERIC(15,2) DEFAULT 0;
ALTER TABLE re_units ADD COLUMN IF NOT EXISTS features TEXT;

-- 4. Add missing re_bookings columns
ALTER TABLE re_bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2);

-- 5. Fix role_id mismatches — roles table overrides users.role via COALESCE(r.name, u.role)
UPDATE users SET role_id='qa-role-9800m', role='manager' WHERE username='qa_re_hr'           AND tenant_id=9800;
UPDATE users SET role_id='qa-role-9800m', role='manager' WHERE username='qa_re_wh'           AND tenant_id=9800;
UPDATE users SET role_id='qa-role-9800m', role='manager' WHERE username='qa_re_prod'         AND tenant_id=9800;
UPDATE users SET role_id='qa-role-9800m', role='manager' WHERE username='qa_re_assets'       AND tenant_id=9800;
UPDATE users SET role_id='qa-role-9800m', role='manager' WHERE username='qa_re_sales'        AND tenant_id=9800;
UPDATE users SET role_id='qa-role-9800r', role='reviewer' WHERE username='qa_re_site_engineer' AND tenant_id=9800;
UPDATE users SET role_id='qa-role-9820o', role='operator' WHERE username='qa_re_s_billing'   AND tenant_id=9820;
UPDATE users SET role_id='qa-role-9821m', role='manager'  WHERE username='qa_re_p_hr'        AND tenant_id=9821;
