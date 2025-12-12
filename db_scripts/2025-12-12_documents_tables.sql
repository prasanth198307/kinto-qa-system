-- Migration: Create Document Management tables
-- Date: 2025-12-12
-- Description: Creates document_categories and documents tables for document management system

-- =====================================================
-- DOCUMENT CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS document_categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id VARCHAR REFERENCES document_categories(id),
    
    -- File information
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    file_path TEXT NOT NULL,
    
    -- Related entity linking (polymorphic)
    related_entity_type VARCHAR(50),
    related_entity_id VARCHAR,
    
    -- Document validity tracking
    document_date DATE,
    expiry_date DATE,
    
    -- Expiry alert tracking
    expiry_alert_sent INTEGER DEFAULT 0,
    expiry_alert_sent_at TIMESTAMP,
    
    -- Version control
    version_number INTEGER DEFAULT 1 NOT NULL,
    parent_document_id VARCHAR,
    
    tags TEXT[],
    remarks TEXT,
    
    uploaded_by VARCHAR REFERENCES users(id),
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_category_id') THEN
        CREATE INDEX idx_documents_category_id ON documents(category_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_related_entity') THEN
        CREATE INDEX idx_documents_related_entity ON documents(related_entity_type, related_entity_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_expiry_date') THEN
        CREATE INDEX idx_documents_expiry_date ON documents(expiry_date);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_record_status') THEN
        CREATE INDEX idx_documents_record_status ON documents(record_status);
    END IF;
END $$;

-- =====================================================
-- SEED DEFAULT CATEGORIES
-- =====================================================
INSERT INTO document_categories (id, name, description)
SELECT gen_random_uuid(), name, description
FROM (VALUES
    ('Contracts', 'Legal contracts and agreements'),
    ('Invoices', 'Invoice documents and receipts'),
    ('Certificates', 'Quality certificates, compliance certificates'),
    ('Licenses', 'Business licenses and permits'),
    ('Insurance', 'Insurance policies and claims'),
    ('Technical', 'Technical specifications and manuals'),
    ('Other', 'Other miscellaneous documents')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM document_categories WHERE name = v.name);

SELECT 'Document tables created successfully' as status;
