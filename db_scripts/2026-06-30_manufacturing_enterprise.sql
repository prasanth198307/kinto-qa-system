-- Manufacturing ERP Enterprise Grade — Phase 7O
-- Quality Inspection Lots, Machine OEE, Standard Cost, Job Cards, Sub-contracting, E-Way Bill

-- ─── QUALITY INSPECTION ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quality_inspection_lots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       INTEGER NOT NULL DEFAULT 1,
  lot_number      VARCHAR(60) NOT NULL,
  inspection_type VARCHAR(10) NOT NULL CHECK (inspection_type IN ('IQC','IPQC','FQC')),
  -- IQC: raw material receipt; IPQC: in-process; FQC: finished goods
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','passed','failed','on_hold')),
  reference_type  VARCHAR(30), -- raw_material_receipt | production_entry | finished_good
  reference_id    VARCHAR(255),
  product_id      VARCHAR(255) REFERENCES products(id),
  raw_material_id VARCHAR(255) REFERENCES raw_materials(id),
  batch_number    VARCHAR(100),
  lot_qty         NUMERIC(12,3),
  sample_qty      NUMERIC(12,3),
  aql_level       VARCHAR(10) DEFAULT '2.5', -- AQL sampling level
  inspected_by    VARCHAR(255) REFERENCES users(id),
  inspected_at    TIMESTAMP,
  passed_qty      NUMERIC(12,3),
  rejected_qty    NUMERIC(12,3),
  disposition     VARCHAR(30), -- accept | reject | rework | conditional_accept
  remarks         TEXT,
  created_by      VARCHAR(255) REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  tenant_id_check INTEGER GENERATED ALWAYS AS (tenant_id) STORED
);

CREATE TABLE IF NOT EXISTS quality_inspection_parameters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       INTEGER NOT NULL DEFAULT 1,
  lot_id          UUID NOT NULL REFERENCES quality_inspection_lots(id) ON DELETE CASCADE,
  parameter_name  VARCHAR(100) NOT NULL, -- pH, TDS, Turbidity, Coliform, Conductivity...
  uom             VARCHAR(30),           -- NTU, mg/L, CFU/100mL, µS/cm
  min_value       NUMERIC(12,4),
  max_value       NUMERIC(12,4),
  actual_value    NUMERIC(12,4),
  result          VARCHAR(10) CHECK (result IN ('pass','fail','na')),
  method          VARCHAR(100),          -- IS 10500, BIS standard, etc.
  remarks         TEXT
);

CREATE INDEX IF NOT EXISTS idx_qil_tenant     ON quality_inspection_lots (tenant_id);
CREATE INDEX IF NOT EXISTS idx_qil_type       ON quality_inspection_lots (tenant_id, inspection_type, status);
CREATE INDEX IF NOT EXISTS idx_qil_ref        ON quality_inspection_lots (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_qip_lot        ON quality_inspection_parameters (lot_id);

-- ─── MACHINE OEE ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS machine_downtime_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       INTEGER NOT NULL DEFAULT 1,
  machine_id      VARCHAR(255) NOT NULL, -- ref to machines table
  machine_name    VARCHAR(255),
  downtime_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  shift           VARCHAR(20),
  start_time      TIMESTAMP NOT NULL,
  end_time        TIMESTAMP,
  duration_minutes NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN end_time IS NOT NULL
    THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60 ELSE NULL END
  ) STORED,
  category        VARCHAR(30) NOT NULL DEFAULT 'unplanned'
                    CHECK (category IN ('planned','unplanned','breakdown','setup','quality','idle')),
  reason          TEXT,
  action_taken    TEXT,
  logged_by       VARCHAR(255) REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS machine_oee_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       INTEGER NOT NULL DEFAULT 1,
  machine_id      VARCHAR(255) NOT NULL,
  machine_name    VARCHAR(255),
  record_date     DATE NOT NULL,
  shift           VARCHAR(20),
  planned_minutes NUMERIC(8,2) NOT NULL DEFAULT 480, -- 8 hr shift
  downtime_minutes NUMERIC(8,2) NOT NULL DEFAULT 0,
  ideal_cycle_time_sec NUMERIC(8,4), -- seconds per unit
  total_units_produced NUMERIC(12,3) DEFAULT 0,
  good_units      NUMERIC(12,3) DEFAULT 0,
  -- OEE components (stored for reporting)
  availability    NUMERIC(5,4), -- (planned - downtime) / planned
  performance     NUMERIC(5,4), -- actual output / ideal output
  quality         NUMERIC(5,4), -- good units / total units
  oee             NUMERIC(5,4), -- availability × performance × quality
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, machine_id, record_date, shift)
);

CREATE INDEX IF NOT EXISTS idx_mdl_machine    ON machine_downtime_logs (tenant_id, machine_id, downtime_date);
CREATE INDEX IF NOT EXISTS idx_oee_machine    ON machine_oee_records (tenant_id, machine_id, record_date);

-- ─── SHOP FLOOR / JOB CARDS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       INTEGER NOT NULL DEFAULT 1,
  job_card_number VARCHAR(60) NOT NULL,
  work_order_id   UUID REFERENCES work_orders(id),
  operation_name  VARCHAR(100) NOT NULL, -- Filling, Capping, Labelling, Packing...
  sequence_no     INTEGER DEFAULT 1,
  machine_id      VARCHAR(255),
  machine_name    VARCHAR(255),
  operator_id     VARCHAR(255) REFERENCES users(id),
  operator_name   VARCHAR(255),
  planned_qty     NUMERIC(12,3),
  actual_qty      NUMERIC(12,3),
  rejected_qty    NUMERIC(12,3) DEFAULT 0,
  planned_start   TIMESTAMP,
  planned_end     TIMESTAMP,
  actual_start    TIMESTAMP,
  actual_end      TIMESTAMP,
  duration_minutes NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN actual_end IS NOT NULL AND actual_start IS NOT NULL
    THEN EXTRACT(EPOCH FROM (actual_end - actual_start)) / 60 ELSE NULL END
  ) STORED,
  status          VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','completed','on_hold')),
  remarks         TEXT,
  created_by      VARCHAR(255) REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jc_tenant      ON job_cards (tenant_id);
CREATE INDEX IF NOT EXISTS idx_jc_wo          ON job_cards (work_order_id);
CREATE INDEX IF NOT EXISTS idx_jc_status      ON job_cards (tenant_id, status);

-- ─── SUB-CONTRACTING / JOB WORK ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_work_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       INTEGER NOT NULL DEFAULT 1,
  jw_number       VARCHAR(60) NOT NULL,
  vendor_id       VARCHAR(255) REFERENCES vendors(id),
  vendor_name     VARCHAR(255),
  vendor_gstin    VARCHAR(20),
  product_id      VARCHAR(255) REFERENCES products(id),
  product_name    VARCHAR(255),
  planned_qty     NUMERIC(12,3),
  received_qty    NUMERIC(12,3) DEFAULT 0,
  rate_per_unit   NUMERIC(12,2),
  total_value     NUMERIC(14,2),
  gst_rate        NUMERIC(5,2) DEFAULT 18,
  status          VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','challan_sent','partially_received','completed','cancelled')),
  planned_return_date DATE,
  actual_return_date  DATE,
  notes           TEXT,
  created_by      VARCHAR(255) REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_work_challans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       INTEGER NOT NULL DEFAULT 1,
  challan_number  VARCHAR(60) NOT NULL, -- Format: JWC/2026-27/001
  challan_type    VARCHAR(10) NOT NULL CHECK (challan_type IN ('outward','inward')),
  job_work_order_id UUID REFERENCES job_work_orders(id),
  challan_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id       VARCHAR(255) REFERENCES vendors(id),
  vendor_name     VARCHAR(255),
  quantity_sent   NUMERIC(12,3),
  quantity_received NUMERIC(12,3),
  raw_material_details JSONB, -- [{materialId, name, qty, unit}]
  eway_bill_number VARCHAR(20),
  vehicle_number  VARCHAR(20),
  status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','received','cancelled')),
  remarks         TEXT,
  created_by      VARCHAR(255) REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jwo_tenant     ON job_work_orders (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_jwc_tenant     ON job_work_challans (tenant_id, challan_type);

-- ─── E-WAY BILL ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eway_bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       INTEGER NOT NULL DEFAULT 1,
  ewb_number      VARCHAR(20),          -- EWB No from NIC API
  ewb_date        TIMESTAMP,
  ewb_valid_until TIMESTAMP,
  gatepass_id     VARCHAR(255),         -- linked gatepass
  invoice_id      VARCHAR(255) REFERENCES invoices(id),
  supply_type     VARCHAR(10) DEFAULT 'O', -- O=Outward, I=Inward
  sub_supply_type VARCHAR(5)  DEFAULT '1', -- 1=Supply, 4=Job Work...
  doc_type        VARCHAR(5)  DEFAULT 'INV',
  doc_number      VARCHAR(50),
  doc_date        DATE,
  from_gstin      VARCHAR(20),
  from_name       VARCHAR(255),
  from_address    TEXT,
  from_pincode    VARCHAR(10),
  from_state_code VARCHAR(5),
  to_gstin        VARCHAR(20),
  to_name         VARCHAR(255),
  to_address      TEXT,
  to_pincode      VARCHAR(10),
  to_state_code   VARCHAR(5),
  total_value     NUMERIC(14,2),
  taxable_value   NUMERIC(14,2),
  cgst            NUMERIC(12,2) DEFAULT 0,
  sgst            NUMERIC(12,2) DEFAULT 0,
  igst            NUMERIC(12,2) DEFAULT 0,
  cess            NUMERIC(12,2) DEFAULT 0,
  transport_mode  VARCHAR(5) DEFAULT '1', -- 1=Road
  vehicle_type    VARCHAR(5) DEFAULT 'R', -- R=Regular
  vehicle_number  VARCHAR(20),
  transporter_id  VARCHAR(20),
  transporter_name VARCHAR(255),
  distance_km     INTEGER,
  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','generated','cancelled','expired')),
  cancel_reason   INTEGER,
  cancel_remarks  TEXT,
  api_response    JSONB,
  created_by      VARCHAR(255) REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ewb_tenant     ON eway_bills (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ewb_gatepass   ON eway_bills (gatepass_id);
CREATE INDEX IF NOT EXISTS idx_ewb_number     ON eway_bills (ewb_number) WHERE ewb_number IS NOT NULL;
