-- Clear all Vyapaar imported data
-- Run this script to remove all imported vendors, products, invoices, and related data
-- This preserves master data (UOMs, roles, permissions, users, etc.)

-- Delete in correct order to avoid foreign key violations
DELETE FROM production_reconciliation_items;
DELETE FROM production_reconciliations;
DELETE FROM production_entries;
DELETE FROM credit_note_items;
DELETE FROM credit_notes;
DELETE FROM sales_return_items;
DELETE FROM sales_returns;
DELETE FROM gatepass_items;
DELETE FROM gatepasses;
DELETE FROM finished_goods;
DELETE FROM raw_material_issuance_items;
DELETE FROM raw_material_issuance;
DELETE FROM invoice_payments;
DELETE FROM invoice_items;
DELETE FROM invoices;
DELETE FROM vendor_vendor_types;
DELETE FROM vendors;
DELETE FROM products;

-- Summary
SELECT 
  'Data cleared successfully' as status,
  'Master data (UOMs, roles, permissions, users) preserved' as note;
