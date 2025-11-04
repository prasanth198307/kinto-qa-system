-- KINTO QA Management System - Performance Indexes
-- Optional but recommended for production deployments
-- Version: 1.0.0
-- Date: 2025-11-04

-- ===========================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ===========================================

-- User authentication and lookup
CREATE INDEX IF NOT EXISTS idx_users_username_status ON users(username, record_status);
CREATE INDEX IF NOT EXISTS idx_users_email_status ON users(email, record_status);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role_id, record_status);

-- Machine status and filtering
CREATE INDEX IF NOT EXISTS idx_machines_status_record ON machines(status, record_status);
CREATE INDEX IF NOT EXISTS idx_machines_type_status ON machines(type, record_status);
CREATE INDEX IF NOT EXISTS idx_machines_next_pm ON machines(next_pm_due) WHERE record_status = 1;

-- Checklist submissions by status
CREATE INDEX IF NOT EXISTS idx_submissions_reviewer_status ON checklist_submissions(reviewer_status, reviewer_id);
CREATE INDEX IF NOT EXISTS idx_submissions_manager_status ON checklist_submissions(manager_status, manager_id);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON checklist_submissions(submission_date DESC);

-- Maintenance scheduling
CREATE INDEX IF NOT EXISTS idx_maintenance_next_exec ON maintenance_plans(next_execution) WHERE record_status = 1;
CREATE INDEX IF NOT EXISTS idx_maintenance_machine_status ON maintenance_plans(machine_id, record_status);

-- Inventory management
CREATE INDEX IF NOT EXISTS idx_raw_materials_low_stock ON raw_materials(current_stock, reorder_level) WHERE record_status = 1 AND current_stock <= reorder_level;
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials(category, record_status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, record_status);

-- Transaction history
CREATE INDEX IF NOT EXISTS idx_raw_transactions_date ON raw_material_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_raw_transactions_material_date ON raw_material_transactions(material_id, transaction_date DESC);

-- Production tracking
CREATE INDEX IF NOT EXISTS idx_finished_goods_date ON finished_goods(production_date DESC);
CREATE INDEX IF NOT EXISTS idx_finished_goods_product_date ON finished_goods(product_id, production_date DESC);
CREATE INDEX IF NOT EXISTS idx_finished_goods_operator ON finished_goods(operator_id, production_date DESC);

-- Purchase orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status, record_status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date DESC);

-- Role permissions lookup
CREATE INDEX IF NOT EXISTS idx_role_perms_role_screen ON role_permissions(role_id, screen_key, record_status);

-- ===========================================
-- FULL TEXT SEARCH INDEXES (PostgreSQL)
-- ===========================================

-- Create GIN indexes for text search on common search fields
CREATE INDEX IF NOT EXISTS idx_machines_name_trgm ON machines USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(product_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_raw_materials_name_trgm ON raw_materials USING gin(material_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_spare_parts_name_trgm ON spare_parts_catalog USING gin(part_name gin_trgm_ops);

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ===========================================
-- PARTIAL INDEXES FOR ACTIVE RECORDS
-- ===========================================

-- Only index active (non-deleted) records for better performance
CREATE INDEX IF NOT EXISTS idx_machines_active ON machines(id) WHERE record_status = 1;
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE record_status = 1;
CREATE INDEX IF NOT EXISTS idx_products_active ON products(id) WHERE record_status = 1;
CREATE INDEX IF NOT EXISTS idx_raw_materials_active ON raw_materials(id) WHERE record_status = 1;
CREATE INDEX IF NOT EXISTS idx_spare_parts_active ON spare_parts_catalog(id) WHERE record_status = 1;

-- ===========================================
-- STATISTICS UPDATE
-- ===========================================

-- Update statistics for query planner optimization
ANALYZE users;
ANALYZE machines;
ANALYZE checklist_templates;
ANALYZE checklist_submissions;
ANALYZE maintenance_plans;
ANALYZE raw_materials;
ANALYZE finished_goods;
ANALYZE products;
ANALYZE purchase_orders;
ANALYZE role_permissions;

-- ===========================================
-- VERIFICATION
-- ===========================================

-- Check index usage (run after system has been running)
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- End of indexes
