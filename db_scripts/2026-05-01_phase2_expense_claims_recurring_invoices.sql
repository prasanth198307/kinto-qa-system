-- Phase 2: Expense Claims + Recurring Invoice Schedules
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS throughout)

-- ── hr_expense_claims ───────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.hr_expense_claims_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.hr_expense_claims (
    id               integer NOT NULL DEFAULT nextval('hr_expense_claims_id_seq'),
    tenant_id        integer NOT NULL,
    employee_id      integer NOT NULL,
    title            text NOT NULL,
    claim_date       date NOT NULL,
    total_amount     numeric(12,2) DEFAULT 0,
    status           text DEFAULT 'pending',
    approved_by      integer,
    approved_at      timestamptz,
    paid_at          timestamptz,
    notes            text,
    rejection_reason text,
    cost_centre_id   integer,
    record_status    integer DEFAULT 1,
    created_at       timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.hr_expense_claims_id_seq OWNED BY public.hr_expense_claims.id;

-- ── hr_expense_claim_items ──────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.hr_expense_claim_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.hr_expense_claim_items (
    id            integer NOT NULL DEFAULT nextval('hr_expense_claim_items_id_seq'),
    tenant_id     integer NOT NULL,
    claim_id      integer NOT NULL,
    category      text NOT NULL,
    description   text,
    amount        numeric(12,2) NOT NULL,
    receipt_url   text,
    expense_date  date,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.hr_expense_claim_items_id_seq OWNED BY public.hr_expense_claim_items.id;

CREATE INDEX IF NOT EXISTS hr_expense_claim_items_claim_idx
    ON public.hr_expense_claim_items (claim_id);

-- ── recurring_invoice_schedules ─────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.recurring_invoice_schedules_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.recurring_invoice_schedules (
    id              integer NOT NULL DEFAULT nextval('recurring_invoice_schedules_id_seq'),
    tenant_id       integer NOT NULL,
    customer_name   text NOT NULL,
    customer_gstin  text,
    billing_address text,
    frequency       text DEFAULT 'monthly',
    next_due        date NOT NULL,
    end_date        date,
    amount          numeric(12,2) NOT NULL,
    description     text,
    hsn_sac         text,
    is_service      boolean DEFAULT true,
    tds_rate        numeric(5,2) DEFAULT 0,
    is_active       boolean DEFAULT true,
    last_generated  date,
    record_status   integer DEFAULT 1,
    created_at      timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.recurring_invoice_schedules_id_seq OWNED BY public.recurring_invoice_schedules.id;
