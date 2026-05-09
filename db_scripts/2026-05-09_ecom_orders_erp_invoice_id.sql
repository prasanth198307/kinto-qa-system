-- Add erp_invoice_id column to jw_ecom_orders (invoices.id is varchar)
ALTER TABLE jw_ecom_orders ADD COLUMN IF NOT EXISTS erp_invoice_id varchar(60);
