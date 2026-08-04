-- Cross-module sync schema additions
-- Adds crm_contact_id / branch_id / employee_id FK columns to vertical tables
-- Creates staff bridge tables for verticals that don't have them yet
-- All ALTER TABLE use ADD COLUMN IF NOT EXISTS — safe to re-run

BEGIN;

-- ─── A. CRM contact reference columns ────────────────────────────────────────
ALTER TABLE restaurant_customers  ADD COLUMN IF NOT EXISTS crm_contact_id INTEGER;
ALTER TABLE hotel_guests           ADD COLUMN IF NOT EXISTS crm_contact_id INTEGER;
ALTER TABLE patients               ADD COLUMN IF NOT EXISTS crm_contact_id INTEGER;

-- ─── B. Branch reference columns on outlet tables ─────────────────────────────
ALTER TABLE restaurant_outlets     ADD COLUMN IF NOT EXISTS branch_id INTEGER;

-- ─── C. Employee_id on restaurant_staff_profiles (already exists, guard only) ─
-- restaurant_staff_profiles already has employee_id — no change needed

-- ─── D. Hotel housekeeping staff bridge ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotel_housekeeping_staff (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  name        VARCHAR(200),
  phone       VARCHAR(30),
  role        VARCHAR(50) DEFAULT 'housekeeping',
  status      VARCHAR(20) DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id)
);

-- ─── E. Clinical staff bridge (Healthcare) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinical_staff (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  name        VARCHAR(200),
  phone       VARCHAR(30),
  role        VARCHAR(50) DEFAULT 'staff',
  status      VARCHAR(20) DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id)
);

-- ─── F. Pharmacy staff bridge ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_staff (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  name        VARCHAR(200),
  phone       VARCHAR(30),
  role        VARCHAR(50) DEFAULT 'pharmacist',
  status      VARCHAR(20) DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id)
);

-- ─── G. NGO staff bridge ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ngo_staff (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  name        VARCHAR(200),
  phone       VARCHAR(30),
  role        VARCHAR(50) DEFAULT 'staff',
  status      VARCHAR(20) DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id)
);

-- ─── H. Real estate agents bridge ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS realestate_agents (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  name        VARCHAR(200),
  phone       VARCHAR(30),
  email       VARCHAR(200),
  status      VARCHAR(20) DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id)
);

-- ─── I. POS staff bridge (Retail) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_staff (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  name        VARCHAR(200),
  phone       VARCHAR(30),
  role        VARCHAR(50) DEFAULT 'cashier',
  is_active   SMALLINT DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id)
);

-- ─── J. Warehouse staff bridge (E-Commerce) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouse_staff (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  name        VARCHAR(200),
  phone       VARCHAR(30),
  role        VARCHAR(50) DEFAULT 'picker',
  is_active   SMALLINT DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id)
);

-- ─── K. Education teachers bridge ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  employee_id INTEGER,
  name        VARCHAR(200) NOT NULL,
  phone       VARCHAR(30),
  email       VARCHAR(200),
  subject     VARCHAR(100),
  status      VARCHAR(20) DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id)
);

-- ─── L. Education student contacts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_contacts (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  crm_contact_id INTEGER NOT NULL,
  name           VARCHAR(200),
  phone          VARCHAR(30),
  email          VARCHAR(200),
  relationship   VARCHAR(50) DEFAULT 'parent',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, crm_contact_id)
);

-- ─── M. Retail customers (if not exists) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS retail_customers (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  name           VARCHAR(200) NOT NULL,
  phone          VARCHAR(30),
  email          VARCHAR(200),
  crm_contact_id INTEGER,
  loyalty_points INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── N. Pharmacy customers (if not exists) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_customers (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  name           VARCHAR(200) NOT NULL,
  phone          VARCHAR(30),
  email          VARCHAR(200),
  crm_contact_id INTEGER,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── O. Logistics customers (if not exists) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS logistics_customers (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  name           VARCHAR(200) NOT NULL,
  phone          VARCHAR(30),
  email          VARCHAR(200),
  address        TEXT,
  crm_contact_id INTEGER,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, crm_contact_id)
);

-- ─── P. Property leads (Real Estate) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_leads (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  crm_contact_id INTEGER,
  name           VARCHAR(200),
  phone          VARCHAR(30),
  email          VARCHAR(200),
  status         VARCHAR(30) DEFAULT 'new',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, crm_contact_id)
);

-- ─── Q. Hotel properties (multi-property support) ─────────────────────────────
CREATE TABLE IF NOT EXISTS hotel_properties (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  property_name VARCHAR(200) NOT NULL,
  address       TEXT,
  phone         VARCHAR(30),
  branch_id     INTEGER,
  is_active     SMALLINT DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, branch_id)
);

-- ─── R. Pharmacy stores (multi-store support) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_stores (
  id         SERIAL PRIMARY KEY,
  tenant_id  INTEGER NOT NULL,
  store_name VARCHAR(200) NOT NULL,
  address    TEXT,
  phone      VARCHAR(30),
  gstin      VARCHAR(20),
  branch_id  INTEGER,
  is_active  SMALLINT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, branch_id)
);

-- ─── S. Retail stores (multi-store support) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS retail_stores (
  id         SERIAL PRIMARY KEY,
  tenant_id  INTEGER NOT NULL,
  store_name VARCHAR(200) NOT NULL,
  address    TEXT,
  phone      VARCHAR(30),
  gstin      VARCHAR(20),
  branch_id  INTEGER,
  is_active  SMALLINT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, branch_id)
);

-- ─── T. Campuses (Education multi-campus) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS campuses (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  campus_name VARCHAR(200) NOT NULL,
  address     TEXT,
  phone       VARCHAR(30),
  branch_id   INTEGER,
  is_active   SMALLINT DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, branch_id)
);

COMMIT;
