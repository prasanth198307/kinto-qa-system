-- T005: Three-way matching (GRN linked to vendor invoices — column addition)
-- T006: Approval Workflows — rules, requests, actions
-- T007: Cost Centres + Payment Terms on vendors/customers
-- T008: Customer Credit Limit + Reorder alerts
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout)

-- ── T005: Link GRN to expense_vouchers (vendor invoices) ────────────
ALTER TABLE public.expense_vouchers
    ADD COLUMN IF NOT EXISTS grn_id         integer,
    ADD COLUMN IF NOT EXISTS matching_status text DEFAULT 'unmatched';
-- matching_status values: 'unmatched' | 'partial' | 'matched'

-- ── T006: approval_rules ────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.approval_rules_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.approval_rules (
    id              integer NOT NULL DEFAULT nextval('approval_rules_id_seq'),
    tenant_id       integer NOT NULL,
    entity_type     text NOT NULL,
    min_amount      numeric(15,2) DEFAULT 0,
    max_amount      numeric(15,2),
    approver_role   text,
    approver_user_id integer,
    approval_level  integer DEFAULT 1,
    record_status   integer DEFAULT 1,
    created_at      timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.approval_rules_id_seq OWNED BY public.approval_rules.id;

-- ── T006: approval_requests ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.approval_requests_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.approval_requests (
    id            integer NOT NULL DEFAULT nextval('approval_requests_id_seq'),
    tenant_id     integer NOT NULL,
    entity_type   text NOT NULL,
    entity_id     integer NOT NULL,
    rule_id       integer,
    requested_by  integer,
    requested_at  timestamptz DEFAULT now(),
    status        text DEFAULT 'pending',
    actioned_by   integer,
    actioned_at   timestamptz,
    comments      text,
    record_status integer DEFAULT 1,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.approval_requests_id_seq OWNED BY public.approval_requests.id;

CREATE INDEX IF NOT EXISTS approval_requests_entity_idx
    ON public.approval_requests (tenant_id, entity_type, entity_id);

-- ── T007: cost_centres ──────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.cost_centres_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.cost_centres (
    id            integer NOT NULL DEFAULT nextval('cost_centres_id_seq'),
    tenant_id     integer NOT NULL,
    name          text NOT NULL,
    code          text,
    parent_id     integer,
    description   text,
    is_active     boolean DEFAULT true,
    record_status integer DEFAULT 1,
    created_at    timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.cost_centres_id_seq OWNED BY public.cost_centres.id;

-- ── T007: cost_centre_id on expense_vouchers and journal_lines ──────
ALTER TABLE public.expense_vouchers
    ADD COLUMN IF NOT EXISTS cost_centre_id integer;

ALTER TABLE public.journal_lines
    ADD COLUMN IF NOT EXISTS cost_centre_id integer;

-- ── T007: payment_terms on vendors ──────────────────────────────────
ALTER TABLE public.vendors
    ADD COLUMN IF NOT EXISTS payment_terms_days integer DEFAULT 30;

-- ── T008: credit_limit on vendors and customers ─────────────────────
ALTER TABLE public.vendors
    ADD COLUMN IF NOT EXISTS credit_limit numeric(15,2) DEFAULT 0;
