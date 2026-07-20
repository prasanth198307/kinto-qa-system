-- Healthcare ERP: fix missing columns and create missing tables

-- 1. patients — add record_status
ALTER TABLE patients ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_no   TEXT;

-- 2. wards — add is_active + missing columns
ALTER TABLE wards ADD COLUMN IF NOT EXISTS is_active       INTEGER DEFAULT 1;
ALTER TABLE wards ADD COLUMN IF NOT EXISTS record_status   INTEGER DEFAULT 1;

-- 3. appointments — add missing columns (route inserts these)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_no    TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_name       TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS specialization    TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS slot_time         TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_fee  NUMERIC(10,2) DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes             TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS record_status     INTEGER DEFAULT 1;

-- 4. lab_tests — repurposed as ordered-test table; add missing columns
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS patient_id     TEXT;
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS ordered_by     TEXT;
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS ordered_date   DATE DEFAULT CURRENT_DATE;
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS result         TEXT;
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS normal_range   TEXT;
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS amount         NUMERIC(10,2) DEFAULT 0;
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS notes          TEXT;
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS result_date    DATE;
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'ordered';
-- tenant_id type: lab_tests has integer, patients has text — cast handled in route with ::text

-- 5. prescriptions — add missing columns
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescription_code TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS notes             TEXT;

-- 6. ipd_admissions — add missing columns
ALTER TABLE ipd_admissions ADD COLUMN IF NOT EXISTS admission_no   TEXT;
ALTER TABLE ipd_admissions ADD COLUMN IF NOT EXISTS doctor_name    TEXT;
ALTER TABLE ipd_admissions ADD COLUMN IF NOT EXISTS treatment      TEXT;
ALTER TABLE ipd_admissions ADD COLUMN IF NOT EXISTS daily_charge   NUMERIC(10,2) DEFAULT 0;
ALTER TABLE ipd_admissions ADD COLUMN IF NOT EXISTS record_status  INTEGER DEFAULT 1;

-- 7. Create medicines table
CREATE TABLE IF NOT EXISTS medicines (
  id              TEXT        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       TEXT        NOT NULL,
  medicine_code   TEXT,
  name            TEXT        NOT NULL,
  generic_name    TEXT,
  category        TEXT,
  unit            TEXT,
  stock_qty       NUMERIC(12,2) DEFAULT 0,
  reorder_level   NUMERIC(12,2) DEFAULT 0,
  purchase_price  NUMERIC(10,2) DEFAULT 0,
  selling_price   NUMERIC(10,2) DEFAULT 0,
  manufacturer    TEXT,
  expiry_date     DATE,
  record_status   INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create patient_bills table
CREATE TABLE IF NOT EXISTS patient_bills (
  id              TEXT        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       TEXT        NOT NULL,
  bill_number     TEXT,
  patient_id      TEXT,
  patient_name    TEXT,
  bill_type       TEXT        DEFAULT 'OPD',
  bill_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  total_amount    NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  paid_amount     NUMERIC(12,2) DEFAULT 0,
  balance_amount  NUMERIC(12,2) DEFAULT 0,
  payment_mode    TEXT        DEFAULT 'cash',
  status          TEXT        DEFAULT 'pending',
  ipd_id          TEXT,
  notes           TEXT,
  record_status   INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create patient_bill_items table
CREATE TABLE IF NOT EXISTS patient_bill_items (
  id          TEXT    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   TEXT    NOT NULL,
  bill_id     TEXT,
  item_type   TEXT,
  item_name   TEXT,
  quantity    NUMERIC(10,2) DEFAULT 1,
  unit_price  NUMERIC(10,2) DEFAULT 0,
  amount      NUMERIC(10,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create prescription_items table
CREATE TABLE IF NOT EXISTS prescription_items (
  id              TEXT    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       TEXT    NOT NULL,
  prescription_id TEXT,
  medicine_id     TEXT,
  medicine_name   TEXT,
  dosage          TEXT,
  frequency       TEXT,
  duration        TEXT,
  quantity        NUMERIC(10,2) DEFAULT 1,
  instructions    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Create hc_vital_history table
CREATE TABLE IF NOT EXISTS hc_vital_history (
  id              TEXT    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       TEXT    NOT NULL,
  patient_id      TEXT,
  visit_id        TEXT,
  bp_systolic     INTEGER,
  bp_diastolic    INTEGER,
  pulse           INTEGER,
  temperature     NUMERIC(5,2),
  weight          NUMERIC(6,2),
  height          NUMERIC(6,2),
  spo2            NUMERIC(5,2),
  recorded_by     TEXT,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Create hc_emr_visits table
CREATE TABLE IF NOT EXISTS hc_emr_visits (
  id              TEXT    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       TEXT    NOT NULL,
  patient_id      TEXT,
  appointment_id  TEXT,
  doctor_id       TEXT,
  visit_date      DATE    DEFAULT CURRENT_DATE,
  chief_complaint TEXT,
  history         TEXT,
  examination     TEXT,
  diagnosis       TEXT,
  icd10_code      TEXT,
  plan            TEXT,
  follow_up_date  DATE,
  record_status   INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Create hc_appointment_reminders table
CREATE TABLE IF NOT EXISTS hc_appointment_reminders (
  id              TEXT    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       TEXT    NOT NULL,
  appointment_id  TEXT,
  patient_id      TEXT,
  reminder_type   TEXT    DEFAULT 'whatsapp',
  send_at         TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  status          TEXT    DEFAULT 'pending',
  message         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Create hc_abha_ids table (ABDM / ABHA health IDs)
CREATE TABLE IF NOT EXISTS hc_abha_ids (
  id              TEXT    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       TEXT    NOT NULL,
  patient_id      TEXT,
  abha_number     TEXT,
  abha_address    TEXT,
  linked_at       TIMESTAMPTZ DEFAULT NOW(),
  verified        BOOLEAN DEFAULT FALSE
);

-- 15. Create abdm_requests table
CREATE TABLE IF NOT EXISTS abdm_requests (
  id              TEXT    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       TEXT    NOT NULL,
  request_type    TEXT,
  patient_id      TEXT,
  payload         JSONB,
  response        JSONB,
  status          TEXT    DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Create icd10_codes table (reference data)
CREATE TABLE IF NOT EXISTS icd10_codes (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category    TEXT
);
INSERT INTO icd10_codes (code, description, category) VALUES
  ('J00',  'Acute nasopharyngitis', 'Respiratory'),
  ('J06.9','Acute upper respiratory infection', 'Respiratory'),
  ('K21.0','Gastro-oesophageal reflux disease', 'Digestive'),
  ('I10',  'Essential hypertension', 'Circulatory'),
  ('E11',  'Type 2 diabetes mellitus', 'Endocrine'),
  ('M54.5','Low back pain', 'Musculoskeletal'),
  ('Z00.0','General adult medical examination', 'Preventive')
ON CONFLICT (code) DO NOTHING;

-- 17. patient_admissions alias (some routes use this name instead of ipd_admissions)
CREATE TABLE IF NOT EXISTS patient_admissions (
  id              TEXT    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       TEXT    NOT NULL,
  patient_id      TEXT,
  ward_id         TEXT,
  bed_no          TEXT,
  admission_date  DATE    NOT NULL DEFAULT CURRENT_DATE,
  discharge_date  DATE,
  diagnosis       TEXT,
  doctor_id       TEXT,
  doctor_name     TEXT,
  daily_charge    NUMERIC(10,2) DEFAULT 0,
  total_charge    NUMERIC(12,2) DEFAULT 0,
  status          TEXT    DEFAULT 'admitted',
  record_status   INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
