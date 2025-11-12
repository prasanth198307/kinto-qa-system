-- Migration: Production Management System
-- Date: 2025-11-12 14:00:02
-- Tables: raw_material_types, product_bom, production_entries, production_reconciliations, production_reconciliation_items
-- Dependencies: products, raw_materials, uom, raw_material_issuance

-- Raw Material Types Table
CREATE TABLE IF NOT EXISTS raw_material_types (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  type_name varchar(255) NOT NULL,
  category varchar(100),
  base_uom_id varchar,
  description text,
  conversion_method varchar(50) DEFAULT 'formula_based' NOT NULL,
  formula text,
  output_coverage integer,
  direct_value integer,
  loss_percentage integer DEFAULT 0 NOT NULL,
  is_active integer DEFAULT 1 NOT NULL,
  notes text,
  created_by varchar,
  updated_by varchar,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT raw_material_types_type_name_unique UNIQUE(type_name)
);

-- Product BOM Table
CREATE TABLE IF NOT EXISTS product_bom (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  product_id varchar NOT NULL,
  raw_material_id varchar NOT NULL,
  quantity_required integer NOT NULL,
  uom_id varchar,
  notes text,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create composite unique index for product_bom
CREATE UNIQUE INDEX IF NOT EXISTS product_bom_product_id_raw_material_id_index 
  ON product_bom (product_id, raw_material_id);

-- Create individual indexes for foreign keys
CREATE INDEX IF NOT EXISTS product_bom_product_id_index ON product_bom (product_id);
CREATE INDEX IF NOT EXISTS product_bom_raw_material_id_index ON product_bom (raw_material_id);

-- Production Entries Table
CREATE TABLE IF NOT EXISTS production_entries (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  issuance_id varchar NOT NULL,
  product_id varchar NOT NULL,
  production_date date NOT NULL,
  shift varchar(50) NOT NULL,
  quantity_produced integer NOT NULL,
  uom_id varchar,
  batch_number varchar(100),
  operator_name varchar(255),
  supervisor_name varchar(255),
  notes text,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Production Reconciliations Table
CREATE TABLE IF NOT EXISTS production_reconciliations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  reconciliation_number varchar(100) NOT NULL,
  issuance_id varchar NOT NULL,
  product_id varchar NOT NULL,
  reconciliation_date date NOT NULL,
  shift varchar(50) NOT NULL,
  total_issued_quantity integer NOT NULL,
  reconciled_by varchar,
  approved_by varchar,
  status varchar(50) DEFAULT 'draft' NOT NULL,
  edit_count integer DEFAULT 0 NOT NULL,
  notes text,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT production_reconciliations_reconciliation_number_unique UNIQUE(reconciliation_number)
);

-- Create composite unique index for production_reconciliations
CREATE UNIQUE INDEX IF NOT EXISTS production_reconciliations_issuance_id_shift_index 
  ON production_reconciliations (issuance_id, shift);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS production_reconciliations_reconciliation_date_index 
  ON production_reconciliations (reconciliation_date);
CREATE INDEX IF NOT EXISTS production_reconciliations_product_id_date_index 
  ON production_reconciliations (product_id, reconciliation_date);

-- Production Reconciliation Items Table
CREATE TABLE IF NOT EXISTS production_reconciliation_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  reconciliation_id varchar NOT NULL,
  raw_material_id varchar NOT NULL,
  issued_quantity integer NOT NULL,
  quantity_used integer NOT NULL,
  quantity_returned integer DEFAULT 0 NOT NULL,
  quantity_pending integer DEFAULT 0 NOT NULL,
  uom_id varchar,
  notes text,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Foreign Keys
ALTER TABLE raw_material_types ADD CONSTRAINT raw_material_types_base_uom_id_uom_id_fk 
  FOREIGN KEY (base_uom_id) REFERENCES uom(id) ON DELETE set null ON UPDATE no action;

ALTER TABLE product_bom ADD CONSTRAINT product_bom_product_id_products_id_fk 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE cascade ON UPDATE no action;

ALTER TABLE product_bom ADD CONSTRAINT product_bom_raw_material_id_raw_materials_id_fk 
  FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id) ON DELETE restrict ON UPDATE no action;

ALTER TABLE production_entries ADD CONSTRAINT production_entries_issuance_id_raw_material_issuance_id_fk 
  FOREIGN KEY (issuance_id) REFERENCES raw_material_issuance(id) ON DELETE restrict ON UPDATE no action;

ALTER TABLE production_entries ADD CONSTRAINT production_entries_product_id_products_id_fk 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE restrict ON UPDATE no action;

ALTER TABLE production_reconciliations ADD CONSTRAINT production_reconciliations_issuance_id_raw_material_issuance_id_fk 
  FOREIGN KEY (issuance_id) REFERENCES raw_material_issuance(id) ON DELETE restrict ON UPDATE no action;

ALTER TABLE production_reconciliations ADD CONSTRAINT production_reconciliations_product_id_products_id_fk 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE restrict ON UPDATE no action;

ALTER TABLE production_reconciliations ADD CONSTRAINT production_reconciliations_reconciled_by_users_id_fk 
  FOREIGN KEY (reconciled_by) REFERENCES users(id) ON DELETE set null ON UPDATE no action;

ALTER TABLE production_reconciliations ADD CONSTRAINT production_reconciliations_approved_by_users_id_fk 
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE set null ON UPDATE no action;

ALTER TABLE production_reconciliation_items ADD CONSTRAINT production_reconciliation_items_reconciliation_id_production_reconciliations_id_fk 
  FOREIGN KEY (reconciliation_id) REFERENCES production_reconciliations(id) ON DELETE cascade ON UPDATE no action;

ALTER TABLE production_reconciliation_items ADD CONSTRAINT production_reconciliation_items_raw_material_id_raw_materials_id_fk 
  FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id) ON DELETE restrict ON UPDATE no action;

ALTER TABLE production_reconciliation_items ADD CONSTRAINT production_reconciliation_items_uom_id_uom_id_fk 
  FOREIGN KEY (uom_id) REFERENCES uom(id) ON DELETE set null ON UPDATE no action;
