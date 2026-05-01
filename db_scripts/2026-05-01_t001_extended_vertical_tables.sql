-- T001 Extended Vertical Tables — all additional tables added for 6 industry verticals
-- These were applied via psql during T001 of the previous session.
-- Run date: 2026-05-01

-- ─────────────────────────────────────────────────────────────────────────────
-- HEALTHCARE (extended)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.doctors (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  doctor_code      VARCHAR(50),
  name             VARCHAR(200) NOT NULL,
  specialty        VARCHAR(100),
  qualification    VARCHAR(200),
  phone            VARCHAR(20),
  email            VARCHAR(150),
  consultation_fee NUMERIC(10,2) DEFAULT 0,
  available_days   VARCHAR(100),
  available_from   TIME,
  available_to     TIME,
  notes            TEXT,
  record_status    INTEGER DEFAULT 1,
  created_at       TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prescriptions (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  prescription_code VARCHAR(50),
  patient_id        TEXT,
  appointment_id    INTEGER,
  doctor_id         INTEGER,
  prescribed_at     TIMESTAMP DEFAULT now(),
  diagnosis         TEXT,
  notes             TEXT,
  record_status     INTEGER DEFAULT 1,
  created_at        TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prescription_items (
  id              SERIAL PRIMARY KEY,
  prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name   VARCHAR(200) NOT NULL,
  dosage          VARCHAR(100),
  frequency       VARCHAR(100),
  duration        VARCHAR(100),
  instructions    TEXT
);

CREATE TABLE IF NOT EXISTS public.lab_tests (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  test_code     VARCHAR(50),
  patient_id    TEXT,
  ordered_by    INTEGER,
  test_name     VARCHAR(200) NOT NULL,
  ordered_date  DATE DEFAULT CURRENT_DATE,
  result        TEXT,
  result_date   DATE,
  normal_range  VARCHAR(200),
  status        VARCHAR(50) DEFAULT 'pending',
  amount        NUMERIC(10,2) DEFAULT 0,
  notes         TEXT,
  record_status INTEGER DEFAULT 1,
  created_at    TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medicines (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  medicine_code  VARCHAR(50),
  name           VARCHAR(200) NOT NULL,
  generic_name   VARCHAR(200),
  category       VARCHAR(100),
  unit           VARCHAR(50),
  stock_qty      NUMERIC(10,2) DEFAULT 0,
  reorder_level  NUMERIC(10,2) DEFAULT 10,
  purchase_price NUMERIC(10,2) DEFAULT 0,
  selling_price  NUMERIC(10,2) DEFAULT 0,
  manufacturer   VARCHAR(200),
  expiry_date    DATE,
  record_status  INTEGER DEFAULT 1,
  created_at     TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_bills (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  bill_number     VARCHAR(50),
  patient_id      TEXT,
  patient_name    VARCHAR(200),
  bill_date       DATE DEFAULT CURRENT_DATE,
  bill_type       VARCHAR(50) DEFAULT 'opd',
  total_amount    NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  paid_amount     NUMERIC(12,2) DEFAULT 0,
  balance_amount  NUMERIC(12,2) DEFAULT 0,
  payment_mode    VARCHAR(50),
  status          VARCHAR(50) DEFAULT 'unpaid',
  notes           TEXT,
  record_status   INTEGER DEFAULT 1,
  created_at      TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_bill_items (
  id          SERIAL PRIMARY KEY,
  bill_id     INTEGER REFERENCES patient_bills(id) ON DELETE CASCADE,
  description VARCHAR(300) NOT NULL,
  quantity    NUMERIC(10,2) DEFAULT 1,
  rate        NUMERIC(10,2) DEFAULT 0,
  amount      NUMERIC(10,2) DEFAULT 0
);

-- Fix: appointments.doctor_id (added later — see fix script)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id INTEGER;
ALTER TABLE appointments ALTER COLUMN doctor_name DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- EDUCATION (extended)
-- ─────────────────────────────────────────────────────────────────────────────

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
  ON student_attendance(tenant_id, student_id, attendance_date);

CREATE TABLE IF NOT EXISTS public.examinations (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  class_id      TEXT,
  exam_name     VARCHAR(200) NOT NULL,
  subject       VARCHAR(100) NOT NULL,
  exam_date     DATE,
  max_marks     NUMERIC(6,2) DEFAULT 100,
  pass_marks    NUMERIC(6,2) DEFAULT 35,
  academic_year VARCHAR(20),
  record_status INTEGER DEFAULT 1,
  created_at    TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_marks (
  id             SERIAL PRIMARY KEY,
  examination_id INTEGER REFERENCES examinations(id) ON DELETE CASCADE,
  student_id     TEXT,
  marks_obtained NUMERIC(6,2),
  grade          VARCHAR(5),
  remarks        TEXT
);

CREATE TABLE IF NOT EXISTS public.library_books (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  book_code        VARCHAR(50),
  title            VARCHAR(300) NOT NULL,
  author           VARCHAR(200),
  isbn             VARCHAR(50),
  category         VARCHAR(100),
  publisher        VARCHAR(200),
  total_copies     INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  rack_number      VARCHAR(50),
  record_status    INTEGER DEFAULT 1,
  created_at       TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.book_issues (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER NOT NULL,
  book_id      INTEGER REFERENCES library_books(id),
  student_id   TEXT,
  student_name VARCHAR(200),
  issue_date   DATE DEFAULT CURRENT_DATE,
  due_date     DATE,
  return_date  DATE,
  fine_amount  NUMERIC(8,2) DEFAULT 0,
  status       VARCHAR(30) DEFAULT 'issued',
  created_at   TIMESTAMP DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- LOGISTICS (extended)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.freight_bills (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  bill_number         VARCHAR(50),
  consignment_note_id INTEGER,
  trip_id             INTEGER,
  bill_date           DATE DEFAULT CURRENT_DATE,
  customer_name       VARCHAR(200),
  from_location       VARCHAR(200),
  to_location         VARCHAR(200),
  weight              NUMERIC(10,2),
  freight_rate        NUMERIC(10,2),
  freight_amount      NUMERIC(12,2) DEFAULT 0,
  loading_charges     NUMERIC(10,2) DEFAULT 0,
  unloading_charges   NUMERIC(10,2) DEFAULT 0,
  other_charges       NUMERIC(10,2) DEFAULT 0,
  total_amount        NUMERIC(12,2) DEFAULT 0,
  paid_amount         NUMERIC(12,2) DEFAULT 0,
  status              VARCHAR(50) DEFAULT 'unpaid',
  notes               TEXT,
  record_status       INTEGER DEFAULT 1,
  created_at          TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fuel_records (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  vehicle_id       INTEGER,
  trip_id          INTEGER,
  record_date      DATE DEFAULT CURRENT_DATE,
  liters           NUMERIC(8,2) NOT NULL,
  rate_per_liter   NUMERIC(8,2),
  amount           NUMERIC(10,2),
  odometer_reading NUMERIC(10,2),
  fuel_station     VARCHAR(200),
  notes            TEXT,
  record_status    INTEGER DEFAULT 1,
  created_at       TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_logs (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  vehicle_id        INTEGER NOT NULL,
  maintenance_date  DATE DEFAULT CURRENT_DATE,
  maintenance_type  VARCHAR(100),
  description       TEXT,
  cost              NUMERIC(10,2) DEFAULT 0,
  vendor_name       VARCHAR(200),
  next_service_date DATE,
  odometer_reading  NUMERIC(10,2),
  record_status     INTEGER DEFAULT 1,
  created_at        TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  vehicle_id    INTEGER,
  doc_type      VARCHAR(100) NOT NULL,
  doc_number    VARCHAR(100),
  issue_date    DATE,
  expiry_date   DATE,
  issued_by     VARCHAR(200),
  notes         TEXT,
  record_status INTEGER DEFAULT 1,
  created_at    TIMESTAMP DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- REAL ESTATE (extended)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.re_brokers (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  broker_code    VARCHAR(50),
  name           VARCHAR(200) NOT NULL,
  firm_name      VARCHAR(200),
  phone          VARCHAR(20),
  email          VARCHAR(150),
  commission_pct NUMERIC(5,2) DEFAULT 0,
  address        TEXT,
  rera_number    VARCHAR(100),
  status         VARCHAR(50) DEFAULT 'active',
  record_status  INTEGER DEFAULT 1,
  created_at     TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.re_construction_progress (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  project_id          TEXT,
  project_name        VARCHAR(200),
  progress_date       DATE DEFAULT CURRENT_DATE,
  stage               VARCHAR(200) NOT NULL,
  percentage_complete NUMERIC(5,2) DEFAULT 0,
  description         TEXT,
  recorded_by         VARCHAR(200),
  record_status       INTEGER DEFAULT 1,
  created_at          TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.re_demand_letters (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  demand_number  VARCHAR(50),
  booking_id     TEXT,
  customer_name  VARCHAR(200),
  unit_number    VARCHAR(100),
  demand_date    DATE DEFAULT CURRENT_DATE,
  due_date       DATE,
  milestone      VARCHAR(200),
  amount         NUMERIC(12,2) DEFAULT 0,
  paid_amount    NUMERIC(12,2) DEFAULT 0,
  status         VARCHAR(50) DEFAULT 'pending',
  notes          TEXT,
  record_status  INTEGER DEFAULT 1,
  created_at     TIMESTAMP DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- POS / RETAIL (extended)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pos_customers (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  customer_code       VARCHAR(50),
  name                VARCHAR(200) NOT NULL,
  phone               VARCHAR(20),
  email               VARCHAR(150),
  address             TEXT,
  loyalty_points      INTEGER DEFAULT 0,
  credit_limit        NUMERIC(12,2) DEFAULT 0,
  outstanding_balance NUMERIC(12,2) DEFAULT 0,
  date_of_birth       DATE,
  anniversary_date    DATE,
  record_status       INTEGER DEFAULT 1,
  created_at          TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_returns (
  id                      SERIAL PRIMARY KEY,
  tenant_id               INTEGER NOT NULL,
  return_number           VARCHAR(50),
  original_transaction_id INTEGER,
  return_date             DATE DEFAULT CURRENT_DATE,
  customer_id             INTEGER,
  return_amount           NUMERIC(12,2) DEFAULT 0,
  reason                  VARCHAR(300),
  refund_mode             VARCHAR(50),
  processed_by            VARCHAR(200),
  notes                   TEXT,
  record_status           INTEGER DEFAULT 1,
  created_at              TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_return_items (
  id           SERIAL PRIMARY KEY,
  return_id    INTEGER REFERENCES pos_returns(id) ON DELETE CASCADE,
  product_id   INTEGER,
  product_name VARCHAR(300),
  quantity     NUMERIC(10,2),
  unit_price   NUMERIC(12,2),
  amount       NUMERIC(12,2)
);

CREATE TABLE IF NOT EXISTS public.pos_promotions (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  promo_code          VARCHAR(50),
  name                VARCHAR(200) NOT NULL,
  promo_type          VARCHAR(50) DEFAULT 'percentage',
  discount_value      NUMERIC(10,2) DEFAULT 0,
  min_purchase_amount NUMERIC(12,2) DEFAULT 0,
  max_discount_amount NUMERIC(12,2),
  start_date          DATE,
  end_date            DATE,
  usage_limit         INTEGER,
  usage_count         INTEGER DEFAULT 0,
  is_active           BOOLEAN DEFAULT TRUE,
  record_status       INTEGER DEFAULT 1,
  created_at          TIMESTAMP DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- AGRICULTURE (extended)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.farmers (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  farmer_code    VARCHAR(50),
  name           VARCHAR(200) NOT NULL,
  phone          VARCHAR(20),
  village        VARCHAR(200),
  taluka         VARCHAR(100),
  district       VARCHAR(100),
  state          VARCHAR(100),
  land_area      NUMERIC(10,2),
  land_area_unit VARCHAR(20) DEFAULT 'acre',
  bank_account   VARCHAR(50),
  bank_name      VARCHAR(200),
  ifsc_code      VARCHAR(20),
  aadhar_number  VARCHAR(20),
  record_status  INTEGER DEFAULT 1,
  created_at     TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crop_inputs (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  crop_cycle_id    TEXT,
  input_type       VARCHAR(100) NOT NULL,
  input_name       VARCHAR(200) NOT NULL,
  quantity         NUMERIC(10,2),
  unit             VARCHAR(50),
  cost_per_unit    NUMERIC(10,2),
  total_cost       NUMERIC(12,2),
  application_date DATE DEFAULT CURRENT_DATE,
  vendor_name      VARCHAR(200),
  notes            TEXT,
  record_status    INTEGER DEFAULT 1,
  created_at       TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.harvest_records (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  crop_cycle_id    TEXT,
  harvest_date     DATE DEFAULT CURRENT_DATE,
  quantity         NUMERIC(10,2) NOT NULL,
  unit             VARCHAR(50) DEFAULT 'kg',
  quality_grade    VARCHAR(20),
  moisture_pct     NUMERIC(5,2),
  market_price     NUMERIC(10,2),
  total_value      NUMERIC(12,2),
  storage_location VARCHAR(200),
  notes            TEXT,
  record_status    INTEGER DEFAULT 1,
  created_at       TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agri_payments (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  payment_code     VARCHAR(50),
  farmer_id        INTEGER REFERENCES farmers(id),
  payment_date     DATE DEFAULT CURRENT_DATE,
  amount           NUMERIC(12,2) NOT NULL,
  purpose          VARCHAR(200),
  payment_mode     VARCHAR(50),
  reference_number VARCHAR(100),
  notes            TEXT,
  record_status    INTEGER DEFAULT 1,
  created_at       TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.soil_tests (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  farm_id         TEXT,
  farm_name       VARCHAR(200),
  test_date       DATE DEFAULT CURRENT_DATE,
  nitrogen        NUMERIC(8,2),
  phosphorus      NUMERIC(8,2),
  potassium       NUMERIC(8,2),
  ph_value        NUMERIC(5,2),
  organic_carbon  NUMERIC(5,2),
  ec_value        NUMERIC(8,2),
  recommendations TEXT,
  tested_by       VARCHAR(200),
  record_status   INTEGER DEFAULT 1,
  created_at      TIMESTAMP DEFAULT now()
);
