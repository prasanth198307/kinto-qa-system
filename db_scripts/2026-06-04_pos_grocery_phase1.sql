-- POS Grocery Phase 1: denomination breakup, split payments, parked bills

ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS opening_denomination jsonb DEFAULT '{}';
ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS closing_denomination jsonb DEFAULT '{}';

ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS payment_splits jsonb DEFAULT '[]';

CREATE TABLE IF NOT EXISTS pos_parked_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  session_id uuid,
  counter_name text NOT NULL DEFAULT '',
  cart_items jsonb NOT NULL DEFAULT '[]',
  customer_id integer,
  customer_name text,
  notes text,
  parked_at timestamptz DEFAULT now()
);
