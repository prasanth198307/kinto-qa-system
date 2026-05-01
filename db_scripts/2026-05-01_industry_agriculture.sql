-- Industry Vertical: Agriculture / Agri-processing
-- Tables: farms, crop_cycles, commodity_prices, agri_procurement
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS throughout)

CREATE TABLE IF NOT EXISTS public.farms (
    id            text NOT NULL DEFAULT gen_random_uuid(),
    tenant_id     text NOT NULL,
    farm_code     text,
    name          text NOT NULL,
    location      text,
    area_acres    numeric(10,2),
    owner_name    text,
    contact_phone text,
    soil_type     text,
    water_source  text,
    is_active     integer DEFAULT 1,
    created_at    timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS farms_tenant_idx ON public.farms (tenant_id);

CREATE TABLE IF NOT EXISTS public.crop_cycles (
    id                    text NOT NULL DEFAULT gen_random_uuid(),
    tenant_id             text NOT NULL,
    farm_id               text,
    crop_name             text NOT NULL,
    variety               text,
    season                text,
    sowing_date           date,
    expected_harvest_date date,
    actual_harvest_date   date,
    area_acres            numeric(10,2),
    seed_qty_kg           numeric(10,2),
    fertilizer_cost       numeric(12,2) DEFAULT 0,
    labor_cost            numeric(12,2) DEFAULT 0,
    other_cost            numeric(12,2) DEFAULT 0,
    yield_qty_tons        numeric(10,3),
    selling_price_per_ton numeric(12,2),
    status                text DEFAULT 'sown',
    notes                 text,
    created_at            timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS crop_cycles_farm_idx ON public.crop_cycles (farm_id);

CREATE TABLE IF NOT EXISTS public.commodity_prices (
    id                text NOT NULL DEFAULT gen_random_uuid(),
    tenant_id         text NOT NULL,
    commodity_name    text NOT NULL,
    variety           text,
    market_name       text,
    price_per_quintal numeric(12,2) NOT NULL,
    min_price         numeric(12,2),
    max_price         numeric(12,2),
    price_date        date NOT NULL,
    source            text,
    created_at        timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.agri_procurement (
    id              text NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       text NOT NULL,
    procurement_no  text,
    farmer_name     text NOT NULL,
    farmer_phone    text,
    commodity       text NOT NULL,
    variety         text,
    quantity_tons   numeric(10,3) NOT NULL,
    rate_per_ton    numeric(12,2) NOT NULL,
    total_amount    numeric(14,2),
    procurement_date date NOT NULL,
    quality_grade   text,
    moisture_pct    numeric(5,2),
    status          text DEFAULT 'received',
    notes           text,
    created_at      timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);
