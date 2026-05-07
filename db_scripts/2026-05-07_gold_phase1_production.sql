-- ============================================================
-- Gold ERP Phase 1: Production 14-Stage Flow
-- Priority: HIGHEST — biggest gap in the entire Excel plan
-- ============================================================

-- 1. Extend jw_design_library with missing jewellery fields
ALTER TABLE jw_design_library
  ADD COLUMN IF NOT EXISTS sub_category       VARCHAR(60),
  ADD COLUMN IF NOT EXISTS style              VARCHAR(80),
  ADD COLUMN IF NOT EXISTS stone_details      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS making_charge_type VARCHAR(20) DEFAULT 'per_gram',
  ADD COLUMN IF NOT EXISTS making_charge_value NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wastage_pct        NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weight_min_gm      NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS weight_max_gm      NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS selling_price_formula TEXT,
  ADD COLUMN IF NOT EXISTS sketch_images      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS render_images      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS version_no         INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active          INTEGER DEFAULT 1;

-- 2. Extend jw_production_orders with jewellery-specific fields
ALTER TABLE jw_production_orders
  ADD COLUMN IF NOT EXISTS customer_name      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS customer_phone     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS item_type          VARCHAR(60),
  ADD COLUMN IF NOT EXISTS total_gold_required_gm NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority           VARCHAR(20) DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS linked_order_id    INTEGER,
  ADD COLUMN IF NOT EXISTS finalized          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS barcode_no         VARCHAR(60),
  ADD COLUMN IF NOT EXISTS huid_no            VARCHAR(20),
  ADD COLUMN IF NOT EXISTS final_weight_gm    NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS settled            INTEGER DEFAULT 0;

-- 3. Extend jw_production_stages with assay/ghat fields
ALTER TABLE jw_production_stages
  ADD COLUMN IF NOT EXISTS purity_tested      NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS expected_purity    NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS purity_variance    NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS operator_name      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS time_taken_mins    INTEGER,
  ADD COLUMN IF NOT EXISTS qc_pass           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS images            JSONB DEFAULT '[]';

-- 4. Sketch Process — per-job customer brief + version tracking
CREATE TABLE IF NOT EXISTS jw_sketch_process (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  production_order_id INTEGER REFERENCES jw_production_orders(id) ON DELETE CASCADE,
  job_id              VARCHAR(40),
  design_id           INTEGER REFERENCES jw_design_library(id),
  sketch_artist       VARCHAR(100),
  sketch_date         DATE DEFAULT CURRENT_DATE,
  customer_brief      TEXT,
  sketch_version      INTEGER DEFAULT 1,
  sketch_images       JSONB DEFAULT '[]',
  ref_images          JSONB DEFAULT '[]',
  approval_status     VARCHAR(30) DEFAULT 'pending',
  revision_notes      TEXT,
  approved_by         VARCHAR(100),
  approved_on         DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_sketch_tenant ON jw_sketch_process(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_sketch_order  ON jw_sketch_process(production_order_id);

-- 5. CAD Process — 3D file upload + weight estimation
CREATE TABLE IF NOT EXISTS jw_cad_process (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  production_order_id INTEGER REFERENCES jw_production_orders(id) ON DELETE CASCADE,
  job_id              VARCHAR(40),
  design_id           INTEGER REFERENCES jw_design_library(id),
  cad_operator        VARCHAR(100),
  software_used       VARCHAR(60),
  cad_file_url        TEXT,
  cad_version         INTEGER DEFAULT 1,
  weight_estimate_gm  NUMERIC(10,3),
  metal_volume_cc     NUMERIC(10,3),
  render_images       JSONB DEFAULT '[]',
  stone_placement_ok  INTEGER DEFAULT 0,
  approval_status     VARCHAR(30) DEFAULT 'pending',
  revision_notes      TEXT,
  approved_by         VARCHAR(100),
  approved_on         DATE,
  est_production_cost NUMERIC(12,2),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_cad_tenant ON jw_cad_process(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_cad_order  ON jw_cad_process(production_order_id);

-- 6. CAM Process — milling/printing prototype
CREATE TABLE IF NOT EXISTS jw_cam_process (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  production_order_id INTEGER REFERENCES jw_production_orders(id) ON DELETE CASCADE,
  job_id              VARCHAR(40),
  cam_operator        VARCHAR(100),
  cam_software        VARCHAR(60),
  machine_name        VARCHAR(100),
  material_type       VARCHAR(30) DEFAULT 'wax',
  cam_file_url        TEXT,
  estimated_hrs       NUMERIC(6,2),
  actual_hrs          NUMERIC(6,2),
  prototype_weight_gm NUMERIC(10,3),
  prototype_images    JSONB DEFAULT '[]',
  qc_pass             INTEGER DEFAULT 0,
  issues_noted        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_cam_tenant ON jw_cam_process(tenant_id);

-- 7. Casting Tree (Tree Setup)
CREATE TABLE IF NOT EXISTS jw_casting_trees (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  tree_code           VARCHAR(40),
  production_order_id INTEGER REFERENCES jw_production_orders(id),
  metal_type          VARCHAR(20) DEFAULT 'gold',
  purity_name         VARCHAR(30),
  sprue_wax_weight_gm NUMERIC(10,3) DEFAULT 0,
  tree_items          JSONB DEFAULT '[]',
  total_wax_weight_gm NUMERIC(10,3) DEFAULT 0,
  gold_required_gm    NUMERIC(10,3) DEFAULT 0,
  casting_alloy_gm    NUMERIC(10,3) DEFAULT 0,
  tree_photo_url      TEXT,
  casting_operator    VARCHAR(100),
  approved_by         VARCHAR(100),
  tree_date           DATE DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_tree_tenant ON jw_casting_trees(tenant_id);

-- 8. Ghat Process — weighing & assaying at each stage
CREATE TABLE IF NOT EXISTS jw_ghat_entries (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  production_order_id INTEGER REFERENCES jw_production_orders(id),
  job_id              VARCHAR(40),
  stage               VARCHAR(30) NOT NULL,
  ghat_date           DATE DEFAULT CURRENT_DATE,
  operator_name       VARCHAR(100),
  item_description    VARCHAR(150),
  gross_weight_gm     NUMERIC(10,3) NOT NULL DEFAULT 0,
  stone_weight_gm     NUMERIC(10,3) DEFAULT 0,
  net_metal_weight_gm NUMERIC(10,3) DEFAULT 0,
  purity_test_method  VARCHAR(30),
  purity_result_pct   NUMERIC(5,2),
  expected_purity_pct NUMERIC(5,2),
  variance_pct        NUMERIC(5,2),
  alloy_composition   TEXT,
  scale_id            VARCHAR(40),
  witnessed_by        VARCHAR(100),
  alert_flag          INTEGER DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_ghat_tenant ON jw_ghat_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_ghat_order  ON jw_ghat_entries(production_order_id);

-- 9. Casting Process
CREATE TABLE IF NOT EXISTS jw_casting_process (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  production_order_id INTEGER REFERENCES jw_production_orders(id),
  casting_tree_id     INTEGER REFERENCES jw_casting_trees(id),
  job_id              VARCHAR(40),
  casting_date        DATE DEFAULT CURRENT_DATE,
  furnace_machine     VARCHAR(100),
  operator_name       VARCHAR(100),
  metal_poured_gm     NUMERIC(10,3) DEFAULT 0,
  alloy_added_gm      NUMERIC(10,3) DEFAULT 0,
  total_melt_gm       NUMERIC(10,3) DEFAULT 0,
  casting_method      VARCHAR(30),
  temperature_c       NUMERIC(6,1),
  casting_time_mins   INTEGER,
  quench_method       VARCHAR(30),
  raw_casting_gm      NUMERIC(10,3) DEFAULT 0,
  sprue_cut_gm        NUMERIC(10,3) DEFAULT 0,
  net_casting_gm      NUMERIC(10,3) DEFAULT 0,
  visual_pass         INTEGER DEFAULT 0,
  issues              TEXT,
  recast_required     INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_casting_tenant ON jw_casting_process(tenant_id);

-- 10. Finishing Stages — Filing / Buffing / Fitting / Polish (one table, stage_type differentiates)
CREATE TABLE IF NOT EXISTS jw_finishing_stages (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  production_order_id INTEGER REFERENCES jw_production_orders(id),
  job_id              VARCHAR(40),
  stage_type          VARCHAR(30) NOT NULL,  -- filing / buffing / fitting / polish
  stage_date          DATE DEFAULT CURRENT_DATE,
  operator_name       VARCHAR(100),
  input_weight_gm     NUMERIC(10,3) DEFAULT 0,
  output_weight_gm    NUMERIC(10,3) DEFAULT 0,
  dust_collected_gm   NUMERIC(10,3) DEFAULT 0,
  wastage_gm          NUMERIC(10,3) GENERATED ALWAYS AS (
                        COALESCE(input_weight_gm,0) - COALESCE(output_weight_gm,0)
                      ) STORED,
  finish_type         VARCHAR(40),
  rhodium_plated      INTEGER DEFAULT 0,
  rhodium_weight_gm   NUMERIC(10,3) DEFAULT 0,
  visual_pass         INTEGER DEFAULT 0,
  time_taken_mins     INTEGER,
  issues              TEXT,
  next_stage          VARCHAR(30),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_finishing_tenant ON jw_finishing_stages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_finishing_order  ON jw_finishing_stages(production_order_id);

-- 11. Job Finalize & Barcode/RFID — links production to finished goods
CREATE TABLE IF NOT EXISTS jw_job_finalize (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  production_order_id INTEGER REFERENCES jw_production_orders(id),
  job_id              VARCHAR(40),
  finalize_date       DATE DEFAULT CURRENT_DATE,
  design_id           INTEGER REFERENCES jw_design_library(id),
  metal_type          VARCHAR(20) DEFAULT 'gold',
  purity_name         VARCHAR(30),
  final_weight_gm     NUMERIC(10,3) NOT NULL DEFAULT 0,
  stone_details       JSONB DEFAULT '[]',
  huid_no             VARCHAR(20),
  barcode_no          VARCHAR(60),
  rfid_tag            VARCHAR(60),
  tag_type            VARCHAR(20) DEFAULT 'barcode',
  tag_printed         INTEGER DEFAULT 0,
  item_photo_url      TEXT,
  certificate_url     TEXT,
  moved_to_stock      INTEGER DEFAULT 0,
  linked_customer     VARCHAR(100),
  ready_for_dispatch  INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_finalize_tenant ON jw_job_finalize(tenant_id);

-- 12. Settlement — karigar job closure (gold accountability)
CREATE TABLE IF NOT EXISTS jw_settlement (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  settlement_no       VARCHAR(40),
  production_order_id INTEGER REFERENCES jw_production_orders(id),
  jobwork_order_id    INTEGER REFERENCES jw_jobwork_orders(id),
  karigar_id          INTEGER REFERENCES jw_karigars(id),
  settlement_date     DATE DEFAULT CURRENT_DATE,
  gold_issued_gm      NUMERIC(10,3) NOT NULL DEFAULT 0,
  gold_returned_gm    NUMERIC(10,3) DEFAULT 0,
  wastage_collected_gm NUMERIC(10,3) DEFAULT 0,
  total_accounted_gm  NUMERIC(10,3) DEFAULT 0,
  unaccounted_gm      NUMERIC(10,3) DEFAULT 0,
  making_charges      NUMERIC(12,2) DEFAULT 0,
  excess_wastage_gm   NUMERIC(10,3) DEFAULT 0,
  excess_deduction    NUMERIC(12,2) DEFAULT 0,
  net_payable         NUMERIC(12,2) DEFAULT 0,
  payment_mode        VARCHAR(30) DEFAULT 'cash',
  settled             INTEGER DEFAULT 0,
  approved_by         VARCHAR(100),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_settlement_tenant  ON jw_settlement(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_settlement_karigar ON jw_settlement(karigar_id);

-- 13. Karigar Material Ledger — issue/return/balance per karigar
CREATE TABLE IF NOT EXISTS jw_karigar_material_ledger (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  karigar_id          INTEGER REFERENCES jw_karigars(id),
  production_order_id INTEGER REFERENCES jw_production_orders(id),
  txn_date            DATE DEFAULT CURRENT_DATE,
  txn_type            VARCHAR(20) NOT NULL,  -- issue / return / wastage
  material_type       VARCHAR(30) DEFAULT 'gold',
  weight_gm           NUMERIC(10,3) NOT NULL DEFAULT 0,
  purity_name         VARCHAR(30),
  purpose             VARCHAR(60),
  balance_gm          NUMERIC(10,3) DEFAULT 0,
  issued_by           VARCHAR(100),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_karigar_mat_tenant  ON jw_karigar_material_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_karigar_mat_karigar ON jw_karigar_material_ledger(karigar_id);

-- 14. Extend jw_jobwork_orders for detailed karigar accountability
ALTER TABLE jw_jobwork_orders
  ADD COLUMN IF NOT EXISTS production_order_id INTEGER,
  ADD COLUMN IF NOT EXISTS design_id           INTEGER,
  ADD COLUMN IF NOT EXISTS stones_issued       JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS findings_issued     TEXT,
  ADD COLUMN IF NOT EXISTS allowed_wastage_pct NUMERIC(5,2) DEFAULT 2,
  ADD COLUMN IF NOT EXISTS allowed_wastage_gm  NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS excess_wastage_gm   NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS excess_deduction    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stones_returned     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status      VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS trade               VARCHAR(60);
