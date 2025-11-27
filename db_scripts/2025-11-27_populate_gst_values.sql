-- Migration: Populate GST Values for Products and Invoice Items
-- Date: 2025-11-27
-- Description: Updates products with GST rates and recalculates invoice item GST
-- HSN 22011010 (Packaged Drinking Water) = 5% GST

-- Step 1: Update products with GST rate (5% for water products)
UPDATE products
SET 
    gst_percent = 5,
    hsn_code = COALESCE(hsn_code, '22011010')
WHERE hsn_code = '22011010' OR product_name ILIKE '%kinto%' OR product_name ILIKE '%purejal%' OR product_name ILIKE '%pani%';

-- Verify products updated
SELECT product_name, hsn_code, gst_percent FROM products WHERE gst_percent IS NOT NULL LIMIT 10;

-- Step 2: Update invoice items with HSN code from linked products
UPDATE invoice_items ii
SET hsn_code = p.hsn_code
FROM products p
WHERE ii.product_id = p.id
  AND (ii.hsn_code IS NULL OR ii.hsn_code = '')
  AND p.hsn_code IS NOT NULL;

-- Step 3: Calculate and update GST for invoice items (5% GST = 2.5% CGST + 2.5% SGST for intrastate)
-- Formula: taxable_value = total_amount / 1.05, gst = total_amount - taxable_value
UPDATE invoice_items
SET 
    cgst_rate = 250,  -- 2.5% stored as basis points
    sgst_rate = 250,  -- 2.5% stored as basis points
    igst_rate = 0,
    taxable_value = ROUND(total_amount / 1.05),
    cgst_amount = ROUND((total_amount - ROUND(total_amount / 1.05)) / 2),
    sgst_amount = ROUND((total_amount - ROUND(total_amount / 1.05)) / 2),
    igst_amount = 0
WHERE hsn_code = '22011010' AND (cgst_rate = 0 OR cgst_rate IS NULL);

-- Step 4: Verify invoice items updated
SELECT 
    ii.description,
    ii.hsn_code,
    ii.total_amount,
    ii.taxable_value,
    ii.cgst_rate,
    ii.cgst_amount,
    ii.sgst_rate,
    ii.sgst_amount
FROM invoice_items ii
LIMIT 10;

-- Step 5: Update invoice totals
UPDATE invoices i
SET 
    taxable_amount = sub.total_taxable,
    cgst_amount = sub.total_cgst,
    sgst_amount = sub.total_sgst,
    igst_amount = sub.total_igst
FROM (
    SELECT 
        invoice_id,
        SUM(COALESCE(taxable_value, 0)) as total_taxable,
        SUM(COALESCE(cgst_amount, 0)) as total_cgst,
        SUM(COALESCE(sgst_amount, 0)) as total_sgst,
        SUM(COALESCE(igst_amount, 0)) as total_igst
    FROM invoice_items
    GROUP BY invoice_id
) sub
WHERE i.id = sub.invoice_id;

-- Step 6: Final verification
SELECT 
    i.invoice_number,
    i.buyer_name,
    i.subtotal,
    i.taxable_amount,
    i.cgst_amount,
    i.sgst_amount,
    i.total_amount
FROM invoices i
WHERE i.invoice_number IN ('336', '346')
ORDER BY i.invoice_number::int;
