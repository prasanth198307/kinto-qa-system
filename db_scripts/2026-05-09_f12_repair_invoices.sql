-- F12 Fix: Create jw_repair_invoices table for generating invoices from completed repairs
-- Run: psql $DATABASE_URL -f db_scripts/2026-05-09_f12_repair_invoices.sql

CREATE TABLE IF NOT EXISTS jw_repair_invoices (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  invoice_no       VARCHAR(50) NOT NULL,
  repair_id        INTEGER,
  repair_no        VARCHAR(50),
  customer_name    VARCHAR(255),
  customer_phone   VARCHAR(50),
  item_description TEXT,
  repair_charges   NUMERIC(12,2) DEFAULT 0,
  gold_added_gm    NUMERIC(10,3) DEFAULT 0,
  gold_rate        NUMERIC(12,2) DEFAULT 0,
  gold_value       NUMERIC(12,2) DEFAULT 0,
  gst_amount       NUMERIC(12,2) DEFAULT 0,
  total_amount     NUMERIC(12,2) DEFAULT 0,
  status           VARCHAR(20) DEFAULT 'unpaid',
  record_status    INTEGER DEFAULT 1,
  created_at       TIMESTAMP DEFAULT NOW()
);
