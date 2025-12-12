-- Migration: Create Daily Cash Register tables
-- Date: 2025-12-12
-- Description: Creates cash_register_days, cash_register_transactions, and cash_register_expense_items tables

-- =====================================================
-- CASH REGISTER DAYS TABLE (Daily Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_register_days (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    register_date DATE NOT NULL,
    
    -- Salesperson/Staff
    salesperson_id VARCHAR REFERENCES users(id),
    salesperson_name VARCHAR(100) NOT NULL,
    
    -- Balances (in paise)
    opening_balance INTEGER DEFAULT 0 NOT NULL,
    closing_balance INTEGER DEFAULT 0 NOT NULL,
    
    -- Aggregated totals (in paise)
    total_deposits INTEGER DEFAULT 0 NOT NULL,
    total_cash_received INTEGER DEFAULT 0 NOT NULL,
    total_expenses INTEGER DEFAULT 0 NOT NULL,
    total_transfers INTEGER DEFAULT 0 NOT NULL,
    
    -- Reconciliation
    status VARCHAR(20) DEFAULT 'open' NOT NULL,
    actual_closing_balance INTEGER,
    reconciled_by VARCHAR REFERENCES users(id),
    reconciled_at TIMESTAMP,
    variance_amount INTEGER DEFAULT 0,
    variance_notes TEXT,
    
    notes TEXT,
    
    -- Discrepancy tracking
    has_discrepancy INTEGER DEFAULT 0 NOT NULL,
    discrepancy_details JSONB,
    
    -- Import tracking
    imported_from_file VARCHAR(500),
    imported_at TIMESTAMP,
    
    created_by VARCHAR REFERENCES users(id),
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- CASH REGISTER TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_register_transactions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id VARCHAR REFERENCES cash_register_days(id) ON DELETE CASCADE NOT NULL,
    
    -- Transaction type
    transaction_type VARCHAR(30) NOT NULL,
    
    -- Amount (in paise)
    amount INTEGER DEFAULT 0 NOT NULL,
    
    -- Reference/Description
    reference VARCHAR(255),
    description TEXT,
    
    -- Source type for cash_received
    source_type VARCHAR(50),
    
    -- For transfers
    transfer_to VARCHAR(100),
    
    -- Document attachment
    document_path VARCHAR(500),
    document_name VARCHAR(255),
    
    -- Voucher conversion tracking
    converted_to_voucher_id VARCHAR REFERENCES expense_vouchers(id),
    converted_at TIMESTAMP,
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- CASH REGISTER EXPENSE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_register_expense_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR REFERENCES cash_register_transactions(id) ON DELETE CASCADE NOT NULL,
    
    -- Parsed item details
    item_label VARCHAR(255) NOT NULL,
    amount INTEGER DEFAULT 0 NOT NULL,
    
    -- Category mapping
    expense_category_id VARCHAR REFERENCES expense_categories(id),
    
    -- Original raw text
    raw_text VARCHAR(500),
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cash_register_days_date') THEN
        CREATE INDEX idx_cash_register_days_date ON cash_register_days(register_date);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cash_register_days_salesperson') THEN
        CREATE INDEX idx_cash_register_days_salesperson ON cash_register_days(salesperson_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cash_register_days_status') THEN
        CREATE INDEX idx_cash_register_days_status ON cash_register_days(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cash_register_transactions_day_id') THEN
        CREATE INDEX idx_cash_register_transactions_day_id ON cash_register_transactions(day_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cash_register_transactions_type') THEN
        CREATE INDEX idx_cash_register_transactions_type ON cash_register_transactions(transaction_type);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cash_register_expense_items_transaction') THEN
        CREATE INDEX idx_cash_register_expense_items_transaction ON cash_register_expense_items(transaction_id);
    END IF;
END $$;

SELECT 'Cash register tables created successfully' as status;
