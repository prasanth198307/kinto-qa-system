-- T002: Proforma Invoice + Multi-currency on Invoices
-- Run date: 2026-05-01
-- Safe to re-run (ADD COLUMN IF NOT EXISTS throughout)

-- ── Extend invoices table ───────────────────────────────────────────
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS invoice_type          text DEFAULT 'tax_invoice',
    ADD COLUMN IF NOT EXISTS currency_code         text DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS exchange_rate         numeric(15,6) DEFAULT 1,
    ADD COLUMN IF NOT EXISTS proforma_ref_id       integer,
    ADD COLUMN IF NOT EXISTS proforma_converted_to integer;

-- invoice_type values: 'tax_invoice' | 'proforma' | 'credit_note'
-- proforma_ref_id: on a converted tax invoice, points back to the original proforma
-- proforma_converted_to: on a proforma, points to the generated tax invoice id
