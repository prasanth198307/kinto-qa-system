-- Industry Vertical: Real Estate / Builders
-- Tables: re_projects, re_units, re_bookings, re_payment_schedules
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS throughout)

CREATE TABLE IF NOT EXISTS public.re_projects (
    id               text NOT NULL DEFAULT gen_random_uuid(),
    tenant_id        text NOT NULL,
    project_name     text NOT NULL,
    project_code     text,
    project_type     text DEFAULT 'residential',
    location         text,
    total_units      integer DEFAULT 0,
    total_area_sqft  numeric(12,2),
    start_date       date,
    completion_date  date,
    status           text DEFAULT 'planning',
    description      text,
    created_at       timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS re_projects_tenant_idx ON public.re_projects (tenant_id);

CREATE TABLE IF NOT EXISTS public.re_units (
    id            text NOT NULL DEFAULT gen_random_uuid(),
    tenant_id     text NOT NULL,
    project_id    text,
    unit_no       text NOT NULL,
    unit_type     text,
    floor_no      integer,
    area_sqft     numeric(10,2),
    base_price    numeric(14,2) DEFAULT 0,
    current_price numeric(14,2) DEFAULT 0,
    facing        text,
    status        text DEFAULT 'available',
    features      text,
    created_at    timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS re_units_project_idx ON public.re_units (project_id);

CREATE TABLE IF NOT EXISTS public.re_bookings (
    id               text NOT NULL DEFAULT gen_random_uuid(),
    tenant_id        text NOT NULL,
    unit_id          text,
    booking_no       text,
    customer_name    text NOT NULL,
    customer_phone   text,
    customer_email   text,
    customer_address text,
    booking_date     date NOT NULL,
    total_amount     numeric(14,2) DEFAULT 0,
    booking_amount   numeric(12,2) DEFAULT 0,
    loan_amount      numeric(14,2) DEFAULT 0,
    bank_name        text,
    status           text DEFAULT 'booked',
    notes            text,
    created_at       timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.re_payment_schedules (
    id           text NOT NULL DEFAULT gen_random_uuid(),
    tenant_id    text NOT NULL,
    booking_id   text,
    milestone    text NOT NULL,
    due_date     date,
    amount       numeric(12,2) NOT NULL,
    paid_date    date,
    paid_amount  numeric(12,2) DEFAULT 0,
    payment_mode text,
    status       text DEFAULT 'pending',
    notes        text,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS re_payment_schedules_booking_idx
    ON public.re_payment_schedules (booking_id);
