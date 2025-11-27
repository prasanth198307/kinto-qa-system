-- Migration: Populate GST Values for Products and Invoice Items
-- Date: 2025-11-27
-- Description: Calculates GST from total amounts using 5% rate (HSN 22011010 - Packaged Water)
-- Formula: taxable = total / 1.05, tax = total - taxable, split 50/50 for CGST/SGST

-- Step 1: Update products with GST rate (5% for water products)
UPDATE products
SET 
    gst_percent = '5',
    hsn_code = COALESCE(hsn_code, '22011010')
WHERE hsn_code = '22011010' 
   OR product_name ILIKE '%kinto%' 
   OR product_name ILIKE '%purejal%' 
   OR product_name ILIKE '%pani%';

-- Step 2: Update invoice items with HSN code from linked products
UPDATE invoice_items ii
SET hsn_code = p.hsn_code
FROM products p
WHERE ii.product_id = p.id
  AND (ii.hsn_code IS NULL OR ii.hsn_code = '')
  AND p.hsn_code IS NOT NULL;

-- Step 3: Calculate and update GST for all invoice items (5% GST = 2.5% CGST + 2.5% SGST)
UPDATE invoice_items
SET 
    cgst_rate = 250,  -- 2.5% stored as basis points
    sgst_rate = 250,  -- 2.5% stored as basis points
    igst_rate = 0,
    taxable_amount = ROUND(total_amount::decimal / 1.05),
    cgst_amount = ROUND((total_amount - ROUND(total_amount::decimal / 1.05)) / 2),
    sgst_amount = ROUND((total_amount - ROUND(total_amount::decimal / 1.05)) / 2),
    igst_amount = 0
WHERE cgst_rate = 0 OR cgst_rate IS NULL;

-- Step 4: Update invoice GST totals from recalculated item GST
UPDATE invoices i
SET 
    cgst_amount = sub.total_cgst,
    sgst_amount = sub.total_sgst,
    igst_amount = sub.total_igst
FROM (
    SELECT 
        invoice_id,
        SUM(COALESCE(cgst_amount, 0)) as total_cgst,
        SUM(COALESCE(sgst_amount, 0)) as total_sgst,
        SUM(COALESCE(igst_amount, 0)) as total_igst
    FROM invoice_items
    GROUP BY invoice_id
) sub
WHERE i.id = sub.invoice_id;

-- Step 5: Verification - check sample invoices
SELECT 
    i.invoice_number,
    i.buyer_name,
    i.subtotal / 100.0 as subtotal_rupees,
    i.cgst_amount / 100.0 as cgst_rupees,
    i.sgst_amount / 100.0 as sgst_rupees,
    i.total_amount / 100.0 as total_rupees
FROM invoices i
ORDER BY i.invoice_number::int DESC
LIMIT 5;

-- Step 6: Verify GST percentages are correct
SELECT 
    COUNT(*) as total_items,
    SUM(CASE WHEN cgst_rate = 250 THEN 1 ELSE 0 END) as items_with_correct_cgst_rate,
    SUM(CASE WHEN cgst_amount > 0 THEN 1 ELSE 0 END) as items_with_gst_amount
FROM invoice_items;
