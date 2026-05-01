-- Industry Vertical: Education
-- Tables: classes, students, fee_structures, fee_payments
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS throughout)

CREATE TABLE IF NOT EXISTS public.classes (
    id            uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id     text NOT NULL,
    name          text NOT NULL,
    grade         text,
    section       text,
    academic_year text,
    teacher_name  text,
    capacity      integer DEFAULT 40,
    is_active     integer DEFAULT 1,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.students (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       text NOT NULL,
    student_code    text NOT NULL,
    name            text NOT NULL,
    dob             date,
    gender          text,
    class_id        uuid,
    parent_name     text,
    parent_phone    text,
    email           text,
    address         text,
    enrollment_date date,
    status          text DEFAULT 'active',
    created_at      timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS students_tenant_idx ON public.students (tenant_id);

CREATE TABLE IF NOT EXISTS public.fee_structures (
    id          uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id   text NOT NULL,
    class_id    uuid,
    fee_type    text NOT NULL,
    amount      numeric(12,2) NOT NULL,
    frequency   text DEFAULT 'monthly',
    is_active   integer DEFAULT 1,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.fee_payments (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id         text NOT NULL,
    student_id        uuid,
    fee_structure_id  uuid,
    receipt_no        text,
    amount            numeric(12,2) NOT NULL,
    paid_date         date NOT NULL,
    payment_mode      text DEFAULT 'cash',
    for_month         text,
    status            text DEFAULT 'paid',
    notes             text,
    created_at        timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS fee_payments_student_idx ON public.fee_payments (student_id);
