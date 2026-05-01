-- Industry Vertical: Retail / Point of Sale (POS)
-- Tables: pos_sessions, pos_transactions, pos_transaction_items
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS throughout)

CREATE TABLE IF NOT EXISTS public.pos_sessions (
    id                  text NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           text NOT NULL,
    user_id             text,
    counter_name        text DEFAULT 'Counter 1',
    opened_at           timestamptz DEFAULT now(),
    closed_at           timestamptz,
    opening_balance     numeric(12,2) DEFAULT 0,
    closing_balance     numeric(12,2),
    total_sales         numeric(12,2) DEFAULT 0,
    total_transactions  integer DEFAULT 0,
    status              text DEFAULT 'open',
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS pos_sessions_tenant_idx ON public.pos_sessions (tenant_id);

CREATE TABLE IF NOT EXISTS public.pos_transactions (
    id               text NOT NULL DEFAULT gen_random_uuid(),
    tenant_id        text NOT NULL,
    session_id       text,
    transaction_no   text NOT NULL,
    customer_name    text,
    customer_phone   text,
    subtotal         numeric(12,2) DEFAULT 0,
    tax_amount       numeric(12,2) DEFAULT 0,
    discount_amount  numeric(12,2) DEFAULT 0,
    total_amount     numeric(12,2) DEFAULT 0,
    payment_mode     text DEFAULT 'cash',
    amount_paid      numeric(12,2) DEFAULT 0,
    change_given     numeric(12,2) DEFAULT 0,
    status           text DEFAULT 'completed',
    created_at       timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS pos_transactions_session_idx ON public.pos_transactions (session_id);
CREATE INDEX IF NOT EXISTS pos_transactions_tenant_idx  ON public.pos_transactions (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.pos_transaction_items (
    id              text NOT NULL DEFAULT gen_random_uuid(),
    transaction_id  text,
    product_id      text,
    product_name    text NOT NULL,
    sku             text,
    quantity        numeric(10,3) NOT NULL,
    unit_price      numeric(12,2) NOT NULL,
    discount_pct    numeric(5,2) DEFAULT 0,
    tax_rate        numeric(5,2) DEFAULT 0,
    total           numeric(12,2) NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS pos_transaction_items_txn_idx
    ON public.pos_transaction_items (transaction_id);
