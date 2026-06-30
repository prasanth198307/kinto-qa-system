-- Phase 5: Multi-country Tax Engine
-- Migration: 2026-06-30_phase5_tax_engine.sql

CREATE TABLE IF NOT EXISTS tenant_tax_settings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL UNIQUE,
  country VARCHAR(50) DEFAULT 'India',
  default_state VARCHAR(50),
  seller_state VARCHAR(50),
  vat_number VARCHAR(50),
  tax_regime VARCHAR(20) DEFAULT 'GST',
  eu_vat_number VARCHAR(50),
  zatca_enabled BOOLEAN DEFAULT false,
  us_state VARCHAR(10),
  additional_rates JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);
