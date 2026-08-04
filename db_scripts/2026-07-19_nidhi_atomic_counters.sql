-- Atomic per-tenant counters for Nidhi member and loan numbers.
-- Replaces COUNT(*)-based generation which has a race condition under concurrent inserts.

CREATE TABLE IF NOT EXISTS nidhi_member_counters (
  tenant_id  INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nidhi_loan_counters (
  tenant_id  INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- Seed counters from existing data so numbers don't restart at 1
INSERT INTO nidhi_member_counters (tenant_id, last_number)
SELECT tenant_id, COUNT(*) FROM nidhi_members GROUP BY tenant_id
ON CONFLICT (tenant_id) DO UPDATE SET last_number = EXCLUDED.last_number;

INSERT INTO nidhi_loan_counters (tenant_id, last_number)
SELECT tenant_id, COUNT(*) FROM nidhi_loans GROUP BY tenant_id
ON CONFLICT (tenant_id) DO UPDATE SET last_number = EXCLUDED.last_number;
