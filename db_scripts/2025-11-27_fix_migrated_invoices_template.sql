-- Migration: Fix Vyapaar-migrated invoices missing template and seller/bank details
-- Date: 2025-11-27
-- Description: Updates all invoices without template_id to use the default template
--              and populates missing seller and bank details from the default template
-- Run this on production database after Vyapaar import

-- Step 1: Find the default template ID (adjust if your default template has different ID)
DO $$
DECLARE
    default_template_id VARCHAR;
    default_seller_name VARCHAR;
    default_seller_gstin VARCHAR;
    default_seller_address TEXT;
    default_seller_state VARCHAR;
    default_seller_state_code VARCHAR;
    default_seller_phone VARCHAR;
    default_seller_email VARCHAR;
    default_bank_name VARCHAR;
    default_bank_account_number VARCHAR;
    default_bank_ifsc_code VARCHAR;
    default_account_holder_name VARCHAR;
    default_upi_id VARCHAR;
    updated_count INTEGER;
BEGIN
    -- Get default template details
    SELECT 
        id, 
        default_seller_name, 
        default_seller_gstin, 
        default_seller_address,
        default_seller_state, 
        default_seller_state_code, 
        default_seller_phone, 
        default_seller_email,
        default_bank_name, 
        default_bank_account_number, 
        default_bank_ifsc_code, 
        default_account_holder_name, 
        default_upi_id
    INTO 
        default_template_id,
        default_seller_name,
        default_seller_gstin,
        default_seller_address,
        default_seller_state,
        default_seller_state_code,
        default_seller_phone,
        default_seller_email,
        default_bank_name,
        default_bank_account_number,
        default_bank_ifsc_code,
        default_account_holder_name,
        default_upi_id
    FROM invoice_templates 
    WHERE is_default = 1 
    LIMIT 1;
    
    IF default_template_id IS NULL THEN
        RAISE EXCEPTION 'No default invoice template found. Please create a default template first.';
    END IF;
    
    RAISE NOTICE 'Using default template: % (ID: %)', default_seller_name, default_template_id;
    
    -- Step 2: Update all invoices without template_id
    UPDATE invoices 
    SET 
        template_id = default_template_id,
        seller_name = COALESCE(seller_name, default_seller_name),
        seller_gstin = COALESCE(seller_gstin, default_seller_gstin),
        seller_address = COALESCE(seller_address, default_seller_address),
        seller_state = COALESCE(seller_state, default_seller_state),
        seller_state_code = COALESCE(seller_state_code, default_seller_state_code),
        seller_phone = COALESCE(seller_phone, default_seller_phone),
        seller_email = COALESCE(seller_email, default_seller_email),
        bank_name = COALESCE(bank_name, default_bank_name),
        bank_account_number = COALESCE(bank_account_number, default_bank_account_number),
        bank_ifsc_code = COALESCE(bank_ifsc_code, default_bank_ifsc_code),
        account_holder_name = COALESCE(account_holder_name, default_account_holder_name),
        upi_id = COALESCE(upi_id, default_upi_id)
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
