-- Add missing created_by column to production_reconciliations table
-- Run this on your local Mac database

DO $$
BEGIN
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'production_reconciliations' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE production_reconciliations ADD COLUMN created_by VARCHAR(255);
        RAISE NOTICE 'Added created_by column to production_reconciliations';
    ELSE
        RAISE NOTICE 'created_by column already exists';
    END IF;
END $$;
