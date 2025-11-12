-- Migration: Sales Returns & Credit Notes System
-- Date: 2025-11-12 14:00:01
-- Tables: sales_returns, sales_return_items, credit_notes, credit_note_items, manual_credit_note_requests
-- Dependencies: invoices, invoice_items, products

-- Sales Returns Table
CREATE TABLE IF NOT EXISTS sales_returns (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  return_number varchar(100) NOT NULL,
  invoice_id varchar NOT NULL,
  return_date date NOT NULL,
  customer_name varchar(255) NOT NULL,
  customer_phone varchar(20),
  return_reason varchar(255) NOT NULL,
  status varchar(50) DEFAULT 'pending' NOT NULL,
  received_date date,
  received_by varchar,
  inspection_date date,
  inspected_by varchar,
  inspection_notes text,
  quality_status varchar(50),
  approved_quantity integer,
  rejected_quantity integer,
  credit_note_status varchar(50) DEFAULT 'not_applicable' NOT NULL,
  notes text,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT sales_returns_return_number_unique UNIQUE(return_number)
);

-- Sales Return Items Table
CREATE TABLE IF NOT EXISTS sales_return_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  return_id varchar NOT NULL,
  product_id varchar NOT NULL,
  invoice_item_id varchar,
  description text NOT NULL,
  quantity integer NOT NULL,
  unit_price integer NOT NULL,
  total_amount integer NOT NULL,
  quality_status varchar(50) DEFAULT 'pending' NOT NULL,
  approved_quantity integer DEFAULT 0 NOT NULL,
  rejected_quantity integer DEFAULT 0 NOT NULL,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Credit Notes Table
CREATE TABLE IF NOT EXISTS credit_notes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  note_number varchar(100) NOT NULL,
  invoice_id varchar NOT NULL,
  sales_return_id varchar,
  credit_date date NOT NULL,
  reason varchar(255) NOT NULL,
  status varchar(50) DEFAULT 'draft' NOT NULL,
  subtotal integer NOT NULL,
  cgst_amount integer DEFAULT 0 NOT NULL,
  sgst_amount integer DEFAULT 0 NOT NULL,
  igst_amount integer DEFAULT 0 NOT NULL,
  grand_total integer NOT NULL,
  issued_by varchar,
  approved_by varchar,
  notes text,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT credit_notes_note_number_unique UNIQUE(note_number)
);

-- Credit Note Items Table
CREATE TABLE IF NOT EXISTS credit_note_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  credit_note_id varchar NOT NULL,
  invoice_item_id varchar,
  product_id varchar NOT NULL,
  description text NOT NULL,
  quantity integer NOT NULL,
  unit_price integer NOT NULL,
  discount_amount integer DEFAULT 0 NOT NULL,
  taxable_value integer NOT NULL,
  cgst_rate integer DEFAULT 0 NOT NULL,
  cgst_amount integer DEFAULT 0 NOT NULL,
  sgst_rate integer DEFAULT 0 NOT NULL,
  sgst_amount integer DEFAULT 0 NOT NULL,
  igst_rate integer DEFAULT 0 NOT NULL,
  igst_amount integer DEFAULT 0 NOT NULL,
  total_amount integer NOT NULL,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Manual Credit Note Requests Table
CREATE TABLE IF NOT EXISTS manual_credit_note_requests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  request_number varchar(100) NOT NULL,
  sales_return_id varchar NOT NULL,
  invoice_id varchar NOT NULL,
  return_date date NOT NULL,
  days_since_invoice integer NOT NULL,
  requested_by varchar,
  requested_at timestamp DEFAULT now(),
  status varchar(50) DEFAULT 'pending' NOT NULL,
  processed_by varchar,
  processed_at timestamp,
  processing_notes text,
  credit_note_id varchar,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT manual_credit_note_requests_request_number_unique UNIQUE(request_number)
);

-- Foreign Keys
ALTER TABLE sales_returns ADD CONSTRAINT sales_returns_invoice_id_invoices_id_fk 
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE restrict ON UPDATE no action;

ALTER TABLE sales_returns ADD CONSTRAINT sales_returns_received_by_users_id_fk 
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE set null ON UPDATE no action;

ALTER TABLE sales_returns ADD CONSTRAINT sales_returns_inspected_by_users_id_fk 
  FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE set null ON UPDATE no action;

ALTER TABLE sales_return_items ADD CONSTRAINT sales_return_items_return_id_sales_returns_id_fk 
  FOREIGN KEY (return_id) REFERENCES sales_returns(id) ON DELETE cascade ON UPDATE no action;

ALTER TABLE sales_return_items ADD CONSTRAINT sales_return_items_product_id_products_id_fk 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE restrict ON UPDATE no action;

ALTER TABLE credit_notes ADD CONSTRAINT credit_notes_invoice_id_invoices_id_fk 
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE restrict ON UPDATE no action;

ALTER TABLE credit_notes ADD CONSTRAINT credit_notes_sales_return_id_sales_returns_id_fk 
  FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id) ON DELETE set null ON UPDATE no action;

ALTER TABLE credit_notes ADD CONSTRAINT credit_notes_issued_by_users_id_fk 
  FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE set null ON UPDATE no action;

ALTER TABLE credit_notes ADD CONSTRAINT credit_notes_approved_by_users_id_fk 
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE set null ON UPDATE no action;

ALTER TABLE credit_note_items ADD CONSTRAINT credit_note_items_credit_note_id_credit_notes_id_fk 
  FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE cascade ON UPDATE no action;

ALTER TABLE credit_note_items ADD CONSTRAINT credit_note_items_product_id_products_id_fk 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE restrict ON UPDATE no action;

ALTER TABLE manual_credit_note_requests ADD CONSTRAINT manual_credit_note_requests_sales_return_id_sales_returns_id_fk 
  FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id) ON DELETE cascade ON UPDATE no action;

ALTER TABLE manual_credit_note_requests ADD CONSTRAINT manual_credit_note_requests_invoice_id_invoices_id_fk 
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE restrict ON UPDATE no action;

ALTER TABLE manual_credit_note_requests ADD CONSTRAINT manual_credit_note_requests_requested_by_users_id_fk 
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE set null ON UPDATE no action;

ALTER TABLE manual_credit_note_requests ADD CONSTRAINT manual_credit_note_requests_processed_by_users_id_fk 
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE set null ON UPDATE no action;
