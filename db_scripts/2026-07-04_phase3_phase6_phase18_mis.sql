-- Phase 3, 6, 18 & MIS Super-Dashboard migrations
-- These tables are also created on-demand via CREATE TABLE IF NOT EXISTS in routes

-- Agriculture: produce batches (Farm-to-Fork QR)
CREATE TABLE IF NOT EXISTS agri_produce_batches (
  id SERIAL PRIMARY KEY, tenant_id INT, farm_id INT,
  batch_code VARCHAR(50) UNIQUE,
  crop_name VARCHAR(200), variety VARCHAR(200),
  harvest_date DATE, quantity_kg NUMERIC(10,3),
  farmer_name VARCHAR(200), farm_location VARCHAR(300),
  pesticide_free BOOLEAN DEFAULT FALSE, organic_certified BOOLEAN DEFAULT FALSE,
  certification_no VARCHAR(100),
  soil_test_report TEXT, water_source VARCHAR(100),
  storage_condition VARCHAR(200),
  journey JSONB DEFAULT '[]',
  qr_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agriculture: PMFBY insurance policies (enhanced)
CREATE TABLE IF NOT EXISTS agri_insurance_policies (
  id SERIAL PRIMARY KEY, tenant_id INT, farm_id INT,
  policy_no VARCHAR(100), scheme VARCHAR(100) DEFAULT 'PMFBY',
  insurance_company VARCHAR(200), season VARCHAR(50),
  year INT, crop_name VARCHAR(200),
  area_hectares NUMERIC(8,3), sum_insured NUMERIC(12,2),
  farmer_premium NUMERIC(10,2), govt_subsidy NUMERIC(12,2),
  total_premium NUMERIC(12,2),
  enrollment_date DATE, policy_start DATE, policy_end DATE,
  status VARCHAR(30) DEFAULT 'active',
  claim_amount NUMERIC(12,2), claim_date DATE, claim_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gold: retail sales
CREATE TABLE IF NOT EXISTS jw_retail_sales (
  id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
  sale_no VARCHAR(50), customer_name VARCHAR(200), item_description VARCHAR(300),
  sale_amount NUMERIC(12,2), gst_pct NUMERIC(5,2) DEFAULT 3, gst_amount NUMERIC(10,2),
  total_amount NUMERIC(12,2), payment_mode VARCHAR(50) DEFAULT 'cash',
  sale_date DATE DEFAULT CURRENT_DATE, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HR: EPFO submissions enhanced (add trrn + ecr_text columns if missing)
CREATE TABLE IF NOT EXISTS hr_epfo_submissions (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL,
  period_month INTEGER NOT NULL, period_year INTEGER NOT NULL,
  trrn VARCHAR(50),
  total_employees INTEGER DEFAULT 0, total_epf_wages NUMERIC(15,2) DEFAULT 0,
  total_eps_wages NUMERIC(15,2) DEFAULT 0, employee_share NUMERIC(15,2) DEFAULT 0,
  employer_share NUMERIC(15,2) DEFAULT 0, status VARCHAR(30) DEFAULT 'generated',
  ecr_data JSONB, ecr_text TEXT, created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE hr_epfo_submissions ADD COLUMN IF NOT EXISTS trrn VARCHAR(50);
ALTER TABLE hr_epfo_submissions ADD COLUMN IF NOT EXISTS ecr_text TEXT;

-- HR: ESI submissions
CREATE TABLE IF NOT EXISTS hr_esi_submissions (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL,
  period_month INTEGER NOT NULL, period_year INTEGER NOT NULL,
  challan_no VARCHAR(50), total_employees INTEGER DEFAULT 0,
  employee_esi NUMERIC(15,2) DEFAULT 0, employer_esi NUMERIC(15,2) DEFAULT 0,
  total_esi NUMERIC(15,2) DEFAULT 0, status VARCHAR(30) DEFAULT 'submitted',
  created_at TIMESTAMP DEFAULT NOW()
);
