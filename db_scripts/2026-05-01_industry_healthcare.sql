-- Industry Vertical: Healthcare
-- Tables: patients, wards, appointments, ipd_admissions
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS throughout)
-- Note: tenant_id is TEXT (UUID-based tenants), id columns use gen_random_uuid()

CREATE TABLE IF NOT EXISTS public.patients (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id         text NOT NULL,
    patient_code      text NOT NULL,
    name              text NOT NULL,
    dob               date,
    gender            text,
    blood_group       text,
    phone             text,
    email             text,
    address           text,
    emergency_contact text,
    allergies         text,
    notes             text,
    record_status     integer DEFAULT 1,
    created_at        timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS patients_tenant_idx ON public.patients (tenant_id);

CREATE TABLE IF NOT EXISTS public.wards (
    id            uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id     text NOT NULL,
    ward_name     text NOT NULL,
    ward_type     text,
    total_beds    integer DEFAULT 0,
    charge_per_day numeric(12,2) DEFAULT 0,
    is_active     integer DEFAULT 1,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.appointments (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id         text NOT NULL,
    appointment_no    text,
    patient_id        uuid,
    doctor_name       text NOT NULL,
    specialization    text,
    appointment_date  date NOT NULL,
    slot_time         text,
    type              text DEFAULT 'OPD',
    status            text DEFAULT 'scheduled',
    consultation_fee  numeric(12,2) DEFAULT 0,
    diagnosis         text,
    prescription      text,
    notes             text,
    created_at        timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS appointments_tenant_date_idx
    ON public.appointments (tenant_id, appointment_date);

CREATE TABLE IF NOT EXISTS public.ipd_admissions (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id      text NOT NULL,
    admission_no   text,
    patient_id     uuid,
    ward_id        uuid,
    bed_no         text,
    doctor_name    text,
    admission_date date NOT NULL,
    discharge_date date,
    diagnosis      text,
    treatment      text,
    daily_charge   numeric(12,2) DEFAULT 0,
    total_bill     numeric(12,2) DEFAULT 0,
    status         text DEFAULT 'admitted',
    created_at     timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);
