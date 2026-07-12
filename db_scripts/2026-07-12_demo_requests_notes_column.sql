-- Add notes and updated_at to demo_requests for super-admin status tracking
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_requests' AND column_name='notes') THEN
    ALTER TABLE demo_requests ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_requests' AND column_name='updated_at') THEN
    ALTER TABLE demo_requests ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;
