-- T003: Purchase Requisitions → PO workflow
-- T004: Goods Receipt Notes (GRN) + Retention on POs
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS throughout)

-- ── purchase_requisitions ───────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.purchase_requisitions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
    id            integer NOT NULL DEFAULT nextval('purchase_requisitions_id_seq'),
    tenant_id     integer NOT NULL,
    pr_number     text NOT NULL,
    pr_date       date NOT NULL DEFAULT CURRENT_DATE,
    requested_by  integer,
    department    text,
    status        text DEFAULT 'draft',
    priority      text DEFAULT 'normal',
    notes         text,
    record_status integer DEFAULT 1,
    created_at    timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.purchase_requisitions_id_seq OWNED BY public.purchase_requisitions.id;

-- ── purchase_requisition_items ──────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.purchase_requisition_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.purchase_requisition_items (
    id              integer NOT NULL DEFAULT nextval('purchase_requisition_items_id_seq'),
    tenant_id       integer NOT NULL,
    pr_id           integer NOT NULL,
    product_id      integer,
    description     text,
    quantity        numeric(15,3) NOT NULL,
    uom             text,
    estimated_price numeric(15,2),
    required_date   date,
    record_status   integer DEFAULT 1,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.purchase_requisition_items_id_seq OWNED BY public.purchase_requisition_items.id;

CREATE INDEX IF NOT EXISTS pr_items_pr_idx ON public.purchase_requisition_items (pr_id);

-- ── goods_receipt_notes ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.goods_receipt_notes_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.goods_receipt_notes (
    id            integer NOT NULL DEFAULT nextval('goods_receipt_notes_id_seq'),
    tenant_id     integer NOT NULL,
    grn_number    text NOT NULL,
    received_date date NOT NULL DEFAULT CURRENT_DATE,
    po_id         integer,
    vendor_id     integer,
    remarks       text,
    received_by   integer,
    status        text DEFAULT 'received',
    record_status integer DEFAULT 1,
    created_at    timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.goods_receipt_notes_id_seq OWNED BY public.goods_receipt_notes.id;

-- ── grn_items ───────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.grn_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.grn_items (
    id            integer NOT NULL DEFAULT nextval('grn_items_id_seq'),
    tenant_id     integer NOT NULL,
    grn_id        integer NOT NULL,
    po_item_id    integer,
    product_id    integer,
    description   text,
    ordered_qty   numeric(15,3) DEFAULT 0,
    received_qty  numeric(15,3) NOT NULL,
    rejected_qty  numeric(15,3) DEFAULT 0,
    unit_price    numeric(15,2) DEFAULT 0,
    record_status integer DEFAULT 1,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.grn_items_id_seq OWNED BY public.grn_items.id;

CREATE INDEX IF NOT EXISTS grn_items_grn_idx ON public.grn_items (grn_id);

-- ── T004: Retention fields on purchase_orders ───────────────────────
ALTER TABLE public.purchase_orders
    ADD COLUMN IF NOT EXISTS retention_percentage numeric(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS retention_amount     numeric(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS retention_released   numeric(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS retention_pct        numeric(5,2) DEFAULT 0;
