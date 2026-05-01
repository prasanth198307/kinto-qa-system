-- Phase 4: Project Management — Projects, BOQ, Billing Milestones, Timesheets
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS throughout)

-- ── projects ────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.projects_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.projects (
    id                 integer NOT NULL DEFAULT nextval('projects_id_seq'),
    tenant_id          integer NOT NULL,
    name               text NOT NULL,
    code               text,
    client_name        text,
    client_gstin       text,
    start_date         date,
    end_date           date,
    contract_value     numeric(14,2) DEFAULT 0,
    status             text DEFAULT 'active',
    project_manager_id integer,
    description        text,
    record_status      integer DEFAULT 1,
    created_at         timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;

-- ── boq_items (Bill of Quantities) ─────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.boq_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.boq_items (
    id             integer NOT NULL DEFAULT nextval('boq_items_id_seq'),
    tenant_id      integer NOT NULL,
    project_id     integer NOT NULL,
    description    text NOT NULL,
    uom            text,
    quantity       numeric(15,3),
    rate           numeric(12,2),
    amount         numeric(14,2),
    actual_qty     numeric(15,3) DEFAULT 0,
    actual_amount  numeric(14,2) DEFAULT 0,
    record_status  integer DEFAULT 1,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.boq_items_id_seq OWNED BY public.boq_items.id;

CREATE INDEX IF NOT EXISTS boq_items_project_idx ON public.boq_items (project_id);

-- ── billing_milestones ──────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.billing_milestones_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.billing_milestones (
    id            integer NOT NULL DEFAULT nextval('billing_milestones_id_seq'),
    tenant_id     integer NOT NULL,
    project_id    integer NOT NULL,
    title         text NOT NULL,
    due_date      date,
    amount        numeric(14,2) NOT NULL,
    percentage    numeric(5,2),
    status        text DEFAULT 'pending',
    invoice_id    integer,
    invoiced_at   date,
    record_status integer DEFAULT 1,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.billing_milestones_id_seq OWNED BY public.billing_milestones.id;

-- ── timesheets ──────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.timesheets_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.timesheets (
    id            integer NOT NULL DEFAULT nextval('timesheets_id_seq'),
    tenant_id     integer NOT NULL,
    employee_id   integer NOT NULL,
    project_id    integer,
    client_name   text,
    work_date     date NOT NULL,
    hours         numeric(5,2) NOT NULL,
    description   text,
    is_billable   boolean DEFAULT true,
    approved      boolean DEFAULT false,
    approved_by   integer,
    record_status integer DEFAULT 1,
    created_at    timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.timesheets_id_seq OWNED BY public.timesheets.id;

CREATE INDEX IF NOT EXISTS timesheets_employee_idx ON public.timesheets (tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS timesheets_project_idx  ON public.timesheets (project_id);
