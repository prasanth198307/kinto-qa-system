-- ============================================================
--  SwachERP — PATCH for sync errors from swacherp_groups7to18_sync.sql
--  Run this AFTER the main sync script to fix the 3 failed statements.
--  100% idempotent — safe to re-run.
--  Connect: psql "$DATABASE_URL" -f db_scripts/2026-05-06_patch_sync_errors.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- FIX 1: cost_centre_id on expense_vouchers
--   (The sync script wrongly targeted "expenses" which never exists;
--    the correct table is expense_vouchers)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.expense_vouchers ADD COLUMN IF NOT EXISTS cost_centre_id integer;

-- ─────────────────────────────────────────────────────────────
-- FIX 2: Base education tables (students, teachers, student_attendance)
--   These were in a different script not included in groups 7-18.
--   Creating them here so the column additions below can run.
-- ─────────────────────────────────────────────────────────────

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

CREATE TABLE IF NOT EXISTS public.teachers (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER NOT NULL,
    teacher_code    VARCHAR(50),
    name            VARCHAR(200) NOT NULL,
    subject         VARCHAR(200),
    qualification   VARCHAR(200),
    phone           VARCHAR(20),
    email           VARCHAR(150),
    date_of_joining DATE,
    salary          NUMERIC(12,2) DEFAULT 0,
    status          VARCHAR(50) DEFAULT 'active',
    record_status   INTEGER DEFAULT 1,
    created_at      TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_attendance (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER NOT NULL,
    student_id      TEXT,
    class_id        TEXT,
    attendance_date DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'present',
    remarks         TEXT,
    created_at      TIMESTAMP DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sa_tenant_student_date_uidx
    ON public.student_attendance (tenant_id, student_id, attendance_date);

-- ─────────────────────────────────────────────────────────────
-- FIX 3: Add new columns to students and teachers
--   (These ran before the tables existed — now tables exist, re-run them)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS blood_group     text,
    ADD COLUMN IF NOT EXISTS section         text,
    ADD COLUMN IF NOT EXISTS roll_number     text,
    ADD COLUMN IF NOT EXISTS transport_opted boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS hostel_opted    boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS admission_no    text,
    ADD COLUMN IF NOT EXISTS academic_year   text;

ALTER TABLE public.teachers
    ADD COLUMN IF NOT EXISTS department  text,
    ADD COLUMN IF NOT EXISTS designation text;

-- ─────────────────────────────────────────────────────────────
-- FIX 4: student_attendance unique index for ON CONFLICT support
-- ─────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS student_attendance_unique_idx
    ON public.student_attendance (student_id, attendance_date);

-- ============================================================
--  END OF PATCH — all 3 sync errors are now resolved.
-- ============================================================
