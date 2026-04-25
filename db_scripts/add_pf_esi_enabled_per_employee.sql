-- Add per-employee PF and ESI opt-out flags
-- Existing employees default to true (enrolled), matching previous behavior
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS pf_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS esi_enabled boolean NOT NULL DEFAULT true;
