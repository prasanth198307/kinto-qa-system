-- Migration: Fix Vyapaar-migrated invoices missing template and seller/bank details
-- Date: 2025-11-27
-- Description: Updates all invoices without template_id to use the default template
--              and populates missing seller and bank details from the default template
-- Run this on production database after Vyapaar import

-- Step 1: Find the default template ID and update invoices
DO $$
DECLARE
    v_template_id VARCHAR;
    v_seller_name VARCHAR;
    v_seller_gstin VARCHAR;
    v_seller_address TEXT;
    v_seller_state VARCHAR;
    v_seller_state_code VARCHAR;
    v_seller_phone VARCHAR;
    v_seller_email VARCHAR;
    v_bank_name VARCHAR;
    v_bank_account_number VARCHAR;
    v_bank_ifsc_code VARCHAR;
    v_account_holder_name VARCHAR;
    v_upi_id VARCHAR;
    updated_count INTEGER;
BEGIN
    -- Get default template details using table alias to avoid ambiguity
    SELECT 
        t.id, 
        t.default_seller_name, 
        t.default_seller_gstin, 
        t.default_seller_address,
        t.default_seller_state, 
        t.default_seller_state_code, 
        t.default_seller_phone, 
        t.default_seller_email,
        t.default_bank_name, 
        t.default_bank_account_number, 
        t.default_bank_ifsc_code, 
        t.default_account_holder_name, 
        t.default_upi_id
    INTO 
        v_template_id,
        v_seller_name,
        v_seller_gstin,
        v_seller_address,
        v_seller_state,
        v_seller_state_code,
        v_seller_phone,
        v_seller_email,
        v_bank_name,
        v_bank_account_number,
        v_bank_ifsc_code,
        v_account_holder_name,
        v_upi_id
    FROM invoice_templates t
    WHERE t.is_default = 1 
    LIMIT 1;
    
    IF v_template_id IS NULL THEN
        RAISE EXCEPTION 'No default invoice template found. Please create a default template first.';
    END IF;
    
    RAISE NOTICE 'Using default template: % (ID: %)', v_seller_name, v_template_id;
    
    -- Step 2: Update all invoices without template_id
    UPDATE invoices 
    SET 
        template_id = v_template_id,
        seller_name = COALESCE(seller_name, v_seller_name),
        seller_gstin = COALESCE(seller_gstin, v_seller_gstin),
        seller_address = COALESCE(seller_address, v_seller_address),
        seller_state = COALESCE(seller_state, v_seller_state),
        seller_state_code = COALESCE(seller_state_code, v_seller_state_code),
        seller_phone = COALESCE(seller_phone, v_seller_phone),
        seller_email = COALESCE(seller_email, v_seller_email),
        bank_name = COALESCE(bank_name, v_bank_name),
        bank_account_number = COALESCE(bank_account_number, v_bank_account_number),
        bank_ifsc_code = COALESCE(bank_ifsc_code, v_bank_ifsc_code),
        account_holder_name = COALESCE(account_holder_name, v_account_holder_name),
        upi_id = COALESCE(upi_id, v_upi_id)
    WHERE template_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % invoices with template and seller/bank details', updated_count;
END $$;

-- Verify the update
SELECT 
    COUNT(*) as total_invoices,
    COUNT(template_id) as with_template,
    COUNT(*) - COUNT(template_id) as without_template
FROM invoices;
