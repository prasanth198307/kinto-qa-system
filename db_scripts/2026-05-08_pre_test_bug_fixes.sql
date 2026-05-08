-- Pre-test bug fixes for F11-F27 and SC tests
-- Run date: 2026-05-08

-- Bug Fix 2: Add daily_rate column to jw_karigars for attendance auto-calculation
ALTER TABLE jw_karigars ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10,2) DEFAULT 0;

-- Seed existing karigars with daily rates (Raju and Suresh = ₹800/day)
UPDATE jw_karigars SET daily_rate = 800 WHERE name = 'Raju Goldsmith';
UPDATE jw_karigars SET daily_rate = 800 WHERE name = 'Suresh Stone Setter';

-- Verify
SELECT id, name, wage_per_gram, daily_rate FROM jw_karigars;
