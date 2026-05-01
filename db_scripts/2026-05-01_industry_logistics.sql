-- Industry Vertical: Logistics & Transport
-- Tables: logistics_vehicles, trips, consignment_notes
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS throughout)
-- Note: id columns use gen_random_uuid() TEXT (not integer sequences)

CREATE TABLE IF NOT EXISTS public.logistics_vehicles (
    id               text NOT NULL DEFAULT gen_random_uuid(),
    tenant_id        text NOT NULL,
    vehicle_no       text NOT NULL,
    vehicle_type     text,
    make_model       text,
    capacity_tons    numeric(10,2),
    owner_name       text,
    driver_name      text,
    driver_phone     text,
    rc_expiry        date,
    insurance_expiry date,
    fitness_expiry   date,
    status           text DEFAULT 'active',
    created_at       timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS logistics_vehicles_tenant_idx ON public.logistics_vehicles (tenant_id);

CREATE TABLE IF NOT EXISTS public.trips (
    id                text NOT NULL DEFAULT gen_random_uuid(),
    tenant_id         text NOT NULL,
    trip_no           text NOT NULL,
    vehicle_id        text,
    driver_name       text,
    from_location     text NOT NULL,
    to_location       text NOT NULL,
    trip_date         date NOT NULL,
    return_date       date,
    goods_description text,
    weight_tons       numeric(10,2),
    freight_amount    numeric(12,2) DEFAULT 0,
    advance_paid      numeric(12,2) DEFAULT 0,
    expenses          numeric(12,2) DEFAULT 0,
    status            text DEFAULT 'planned',
    notes             text,
    created_at        timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS trips_tenant_idx ON public.trips (tenant_id);

CREATE TABLE IF NOT EXISTS public.consignment_notes (
    id                text NOT NULL DEFAULT gen_random_uuid(),
    tenant_id         text NOT NULL,
    lr_no             text NOT NULL,
    trip_id           text,
    consignor_name    text NOT NULL,
    consignor_phone   text,
    consignee_name    text NOT NULL,
    consignee_phone   text,
    goods_description text,
    packages          integer DEFAULT 1,
    weight_kg         numeric(10,2),
    freight_charges   numeric(12,2) DEFAULT 0,
    loading_charges   numeric(12,2) DEFAULT 0,
    delivery_date     date,
    status            text DEFAULT 'in_transit',
    created_at        timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);
