-- Phase 3: Multi-location Warehouses, UOM Conversions, Serial/Lot Register, Stock Transfers
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS throughout)

-- ── warehouses ──────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.warehouses_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.warehouses (
    id            integer NOT NULL DEFAULT nextval('warehouses_id_seq'),
    tenant_id     integer NOT NULL,
    name          text NOT NULL,
    code          text,
    address       text,
    city          text,
    state         text,
    is_default    boolean DEFAULT false,
    record_status integer DEFAULT 1,
    created_at    timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;

-- ── warehouse_stock ─────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.warehouse_stock_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.warehouse_stock (
    id            integer NOT NULL DEFAULT nextval('warehouse_stock_id_seq'),
    tenant_id     integer NOT NULL,
    warehouse_id  integer NOT NULL,
    item_id       text NOT NULL,
    quantity      numeric(15,3) DEFAULT 0,
    reserved      numeric(15,3) DEFAULT 0,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.warehouse_stock_id_seq OWNED BY public.warehouse_stock.id;

CREATE UNIQUE INDEX IF NOT EXISTS warehouse_stock_item_uidx
    ON public.warehouse_stock (tenant_id, warehouse_id, item_id);

-- ── uom (Unit of Measure) ───────────────────────────────────────────
-- Note: id is UUID text, not a sequence
CREATE TABLE IF NOT EXISTS public.uom (
    id            varchar DEFAULT gen_random_uuid() NOT NULL,
    code          varchar(50) NOT NULL,
    name          varchar(100) NOT NULL,
    description   text,
    is_active     varchar DEFAULT 'true',
    created_at    timestamp DEFAULT now(),
    updated_at    timestamp DEFAULT now(),
    record_status integer DEFAULT 1 NOT NULL,
    tenant_id     integer DEFAULT 1,
    PRIMARY KEY (id)
);

-- ── uom_conversions ─────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.uom_conversions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.uom_conversions (
    id            integer NOT NULL DEFAULT nextval('uom_conversions_id_seq'),
    tenant_id     integer NOT NULL,
    item_id       text,
    from_uom      text NOT NULL,
    to_uom        text NOT NULL,
    factor        numeric(15,6) NOT NULL,
    record_status integer DEFAULT 1,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.uom_conversions_id_seq OWNED BY public.uom_conversions.id;

-- ── serial_lot_register ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.serial_lot_register_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.serial_lot_register (
    id               integer NOT NULL DEFAULT nextval('serial_lot_register_id_seq'),
    tenant_id        integer NOT NULL,
    item_id          text NOT NULL,
    serial_number    text,
    lot_number       text,
    batch_number     text,
    manufactured_date date,
    expiry_date      date,
    quantity         numeric(15,3) DEFAULT 1,
    status           text DEFAULT 'in_stock',
    source_type      text,
    source_id        integer,
    warehouse_id     integer,
    record_status    integer DEFAULT 1,
    created_at       timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.serial_lot_register_id_seq OWNED BY public.serial_lot_register.id;

-- ── stock_transfers ─────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.stock_transfers_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id                integer NOT NULL DEFAULT nextval('stock_transfers_id_seq'),
    tenant_id         integer NOT NULL,
    from_warehouse_id integer,
    to_warehouse_id   integer NOT NULL,
    transfer_date     date NOT NULL,
    reference_no      text,
    notes             text,
    status            text DEFAULT 'draft',
    record_status     integer DEFAULT 1,
    created_at        timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.stock_transfers_id_seq OWNED BY public.stock_transfers.id;

-- ── stock_transfer_items ────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.stock_transfer_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
    id           integer NOT NULL DEFAULT nextval('stock_transfer_items_id_seq'),
    tenant_id    integer NOT NULL,
    transfer_id  integer NOT NULL,
    item_id      text NOT NULL,
    item_name    text,
    quantity     numeric(15,3) NOT NULL,
    uom          text,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.stock_transfer_items_id_seq OWNED BY public.stock_transfer_items.id;
