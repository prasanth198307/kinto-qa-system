-- Phase 5: Fixed Assets + Depreciation, Performance Appraisals, Multi-currency
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS throughout)

-- ── fixed_assets ────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.fixed_assets_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.fixed_assets (
    id                   integer NOT NULL DEFAULT nextval('fixed_assets_id_seq'),
    tenant_id            integer NOT NULL,
    name                 text NOT NULL,
    asset_code           text,
    category             text,
    purchase_date        date,
    purchase_cost        numeric(14,2),
    useful_life_months   integer,
    salvage_value        numeric(14,2) DEFAULT 0,
    depreciation_method  text DEFAULT 'straight_line',
    current_value        numeric(14,2),
    location             text,
    vendor_name          text,
    invoice_ref          text,
    status               text DEFAULT 'active',
    record_status        integer DEFAULT 1,
    created_at           timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.fixed_assets_id_seq OWNED BY public.fixed_assets.id;

-- ── asset_depreciation_schedule ─────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.asset_depreciation_schedule_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.asset_depreciation_schedule (
    id              integer NOT NULL DEFAULT nextval('asset_depreciation_schedule_id_seq'),
    tenant_id       integer NOT NULL,
    asset_id        integer NOT NULL,
    period_year     integer,
    period_month    integer,
    opening_value   numeric(14,2),
    depreciation    numeric(14,2),
    closing_value   numeric(14,2),
    posted          boolean DEFAULT false,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.asset_depreciation_schedule_id_seq OWNED BY public.asset_depreciation_schedule.id;

CREATE INDEX IF NOT EXISTS asset_dep_asset_idx ON public.asset_depreciation_schedule (asset_id);

-- ── appraisal_cycles ────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.appraisal_cycles_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.appraisal_cycles (
    id            integer NOT NULL DEFAULT nextval('appraisal_cycles_id_seq'),
    tenant_id     integer NOT NULL,
    name          text NOT NULL,
    period_from   date,
    period_to     date,
    status        text DEFAULT 'draft',
    record_status integer DEFAULT 1,
    created_at    timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.appraisal_cycles_id_seq OWNED BY public.appraisal_cycles.id;

-- ── appraisals ──────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.appraisals_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.appraisals (
    id              integer NOT NULL DEFAULT nextval('appraisals_id_seq'),
    tenant_id       integer NOT NULL,
    cycle_id        integer NOT NULL,
    employee_id     integer NOT NULL,
    appraiser_id    integer,
    self_rating     numeric(3,1),
    manager_rating  numeric(3,1),
    final_rating    numeric(3,1),
    strengths       text,
    improvements    text,
    goals           text,
    status          text DEFAULT 'pending',
    record_status   integer DEFAULT 1,
    created_at      timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.appraisals_id_seq OWNED BY public.appraisals.id;

-- ── appraisal_kras (Key Result Areas) ──────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.appraisal_kras_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.appraisal_kras (
    id            integer NOT NULL DEFAULT nextval('appraisal_kras_id_seq'),
    tenant_id     integer NOT NULL,
    appraisal_id  integer NOT NULL,
    kra           text NOT NULL,
    weightage     numeric(5,2),
    self_score    numeric(3,1),
    manager_score numeric(3,1),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.appraisal_kras_id_seq OWNED BY public.appraisal_kras.id;

-- ── currencies ──────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.currencies_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.currencies (
    id            integer NOT NULL DEFAULT nextval('currencies_id_seq'),
    tenant_id     integer NOT NULL,
    code          text NOT NULL,
    name          text NOT NULL,
    symbol        text,
    is_base       boolean DEFAULT false,
    record_status integer DEFAULT 1,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.currencies_id_seq OWNED BY public.currencies.id;

CREATE UNIQUE INDEX IF NOT EXISTS currencies_tenant_code_uidx
    ON public.currencies (tenant_id, code);

-- ── exchange_rates ──────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.exchange_rates_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id           integer NOT NULL DEFAULT nextval('exchange_rates_id_seq'),
    tenant_id    integer NOT NULL,
    currency_id  integer NOT NULL,
    rate         date NOT NULL,
    rate_value   numeric(15,6) NOT NULL,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.exchange_rates_id_seq OWNED BY public.exchange_rates.id;
