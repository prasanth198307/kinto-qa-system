-- Migration: Financial & Invoicing System
-- Date: 2025-11-12 14:00:00
-- Tables: banks, invoices, invoice_items, invoice_payments, invoice_templates, terms_conditions
-- Dependencies: None (master data)

-- Banks Table
CREATE TABLE IF NOT EXISTS banks (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  bank_name varchar(255) NOT NULL,
  account_holder_name varchar(255) NOT NULL,
  account_number varchar(50) NOT NULL,
  ifsc_code varchar(11) NOT NULL,
  branch_name varchar(255),
  account_type varchar(50),
  upi_id varchar(100),
  is_default integer DEFAULT 0 NOT NULL,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT banks_account_number_unique UNIQUE(account_number)
);

-- Invoice Templates Table
CREATE TABLE IF NOT EXISTS invoice_templates (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  template_name varchar(255) NOT NULL,
  company_name varchar(255),
  company_address text,
  company_phone varchar(20),
  company_email varchar(100),
  company_gstin varchar(15),
  company_pan varchar(10),
  company_logo_url text,
  header_content text,
  footer_content text,
  signature_name varchar(255),
  signature_designation varchar(100),
  bank_details text,
  terms_notes text,
  show_bank_details integer DEFAULT 1 NOT NULL,
  show_signature integer DEFAULT 1 NOT NULL,
  is_default integer DEFAULT 0 NOT NULL,
  is_active integer DEFAULT 1 NOT NULL,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT invoice_templates_template_name_unique UNIQUE(template_name)
);

-- Terms & Conditions Table
CREATE TABLE IF NOT EXISTS terms_conditions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  template_id varchar NOT NULL,
  term_text text NOT NULL,
  display_order integer NOT NULL,
  is_active integer DEFAULT 1 NOT NULL,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  invoice_number varchar(100) NOT NULL,
  invoice_date date NOT NULL,
  customer_name varchar(255) NOT NULL,
  customer_address text,
  customer_phone varchar(20),
  customer_email varchar(100),
  customer_gstin varchar(15),
  customer_pan varchar(10),
  customer_state_code varchar(2),
  place_of_supply varchar(100),
  buyer_order_number varchar(100),
  buyer_order_date date,
  dispatch_doc_no varchar(100),
  dispatch_through varchar(255),
  destination varchar(255),
  vehicle_number varchar(50),
  lr_number varchar(50),
  lr_date date,
  eway_bill_number varchar(50),
  payment_terms varchar(255),
  due_date date,
  subtotal integer NOT NULL,
  discount_amount integer DEFAULT 0 NOT NULL,
  cgst_amount integer DEFAULT 0 NOT NULL,
  sgst_amount integer DEFAULT 0 NOT NULL,
  igst_amount integer DEFAULT 0 NOT NULL,
  cess_amount integer DEFAULT 0 NOT NULL,
  tcs_amount integer DEFAULT 0 NOT NULL,
  round_off integer DEFAULT 0 NOT NULL,
  grand_total integer NOT NULL,
  amount_in_words text,
  template_id varchar,
  company_name varchar(255),
  company_address text,
  company_phone varchar(20),
  company_email varchar(100),
  company_gstin varchar(15),
  company_pan varchar(10),
  company_state_code varchar(2),
  bank_details text,
  terms_notes text,
  signature_name varchar(255),
  signature_designation varchar(100),
  payment_status varchar(50) DEFAULT 'unpaid' NOT NULL,
  total_paid integer DEFAULT 0 NOT NULL,
  balance_due integer DEFAULT 0 NOT NULL,
  status varchar(50) DEFAULT 'draft' NOT NULL,
  created_by varchar,
  notes text,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT invoices_invoice_number_unique UNIQUE(invoice_number)
);

-- Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  invoice_id varchar NOT NULL,
  product_id varchar,
  gatepass_item_id varchar,
  item_number integer NOT NULL,
  description text NOT NULL,
  hsn_code varchar(20),
  quantity integer NOT NULL,
  uom varchar(50),
  unit_price integer NOT NULL,
  discount_percent integer DEFAULT 0 NOT NULL,
  discount_amount integer DEFAULT 0 NOT NULL,
  taxable_value integer NOT NULL,
  cgst_rate integer DEFAULT 0 NOT NULL,
  cgst_amount integer DEFAULT 0 NOT NULL,
  sgst_rate integer DEFAULT 0 NOT NULL,
  sgst_amount integer DEFAULT 0 NOT NULL,
  igst_rate integer DEFAULT 0 NOT NULL,
  igst_amount integer DEFAULT 0 NOT NULL,
  cess_amount integer DEFAULT 0 NOT NULL,
  total_amount integer NOT NULL,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Invoice Payments Table
CREATE TABLE IF NOT EXISTS invoice_payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  invoice_id varchar NOT NULL,
  payment_date date NOT NULL,
  payment_amount integer NOT NULL,
  payment_method varchar(50) NOT NULL,
  transaction_reference varchar(255),
  payment_notes text,
  received_by varchar,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Foreign Keys
ALTER TABLE terms_conditions ADD CONSTRAINT terms_conditions_template_id_invoice_templates_id_fk 
  FOREIGN KEY (template_id) REFERENCES invoice_templates(id) ON DELETE cascade ON UPDATE no action;

ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_invoice_id_invoices_id_fk 
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE cascade ON UPDATE no action;

ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_product_id_products_id_fk 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE set null ON UPDATE no action;

ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_gatepass_item_id_gatepass_items_id_fk 
  FOREIGN KEY (gatepass_item_id) REFERENCES gatepass_items(id) ON DELETE set null ON UPDATE no action;

ALTER TABLE invoice_payments ADD CONSTRAINT invoice_payments_invoice_id_invoices_id_fk 
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE cascade ON UPDATE no action;

ALTER TABLE invoice_payments ADD CONSTRAINT invoice_payments_received_by_users_id_fk 
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE set null ON UPDATE no action;
