-- Add batch/lot/expiry columns to grn_items for perishable goods tracking
ALTER TABLE grn_items
  ADD COLUMN IF NOT EXISTS batch_number TEXT,
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS manufactured_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE;
