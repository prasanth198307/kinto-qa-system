-- T001: Item Master Enhancements — Goods/Service type, HSN/SAC, Reorder, Item Variants, Price Lists
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout)

-- ── Extend products table ───────────────────────────────────────────
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS hsn_code    varchar,
    ADD COLUMN IF NOT EXISTS sac_code    varchar,
    ADD COLUMN IF NOT EXISTS item_type   text DEFAULT 'goods',
    ADD COLUMN IF NOT EXISTS reorder_point numeric(15,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reorder_qty   numeric(15,3) DEFAULT 0;

-- ── item_variants ───────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.item_variants_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.item_variants (
    id             integer NOT NULL DEFAULT nextval('item_variants_id_seq'),
    tenant_id      integer NOT NULL,
    product_id     integer NOT NULL,
    sku            text,
    attributes     jsonb DEFAULT '{}',
    price_override numeric(15,2),
    stock_qty      numeric(15,3) DEFAULT 0,
    record_status  integer DEFAULT 1,
    created_at     timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.item_variants_id_seq OWNED BY public.item_variants.id;

CREATE INDEX IF NOT EXISTS item_variants_product_idx ON public.item_variants (product_id);

-- ── price_lists ─────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.price_lists_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.price_lists (
    id             integer NOT NULL DEFAULT nextval('price_lists_id_seq'),
    tenant_id      integer NOT NULL,
    name           text NOT NULL,
    currency       text DEFAULT 'INR',
    effective_from date,
    effective_to   date,
    description    text,
    record_status  integer DEFAULT 1,
    created_at     timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.price_lists_id_seq OWNED BY public.price_lists.id;

-- ── price_list_items ────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.price_list_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.price_list_items (
    id             integer NOT NULL DEFAULT nextval('price_list_items_id_seq'),
    tenant_id      integer NOT NULL,
    price_list_id  integer NOT NULL,
    product_id     integer,
    product_name   text,
    unit_price     numeric(15,2) NOT NULL,
    discount_pct   numeric(5,2) DEFAULT 0,
    uom            text,
    record_status  integer DEFAULT 1,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.price_list_items_id_seq OWNED BY public.price_list_items.id;

CREATE INDEX IF NOT EXISTS price_list_items_list_idx ON public.price_list_items (price_list_id);
