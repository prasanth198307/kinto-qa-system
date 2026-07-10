-- Add missing columns to re_bookings
ALTER TABLE re_bookings
  ADD COLUMN IF NOT EXISTS booking_no        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS customer_address  TEXT,
  ADD COLUMN IF NOT EXISTS bank_name         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS broker_id         INTEGER,
  ADD COLUMN IF NOT EXISTS agreement_date    DATE,
  ADD COLUMN IF NOT EXISTS possession_date   DATE,
  ADD COLUMN IF NOT EXISTS possession_status VARCHAR(30) DEFAULT 'pending';

-- Add missing columns to re_construction_progress
ALTER TABLE re_construction_progress
  ADD COLUMN IF NOT EXISTS project_name   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS progress_date  DATE,
  ADD COLUMN IF NOT EXISTS stage          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS recorded_by    VARCHAR(100);
