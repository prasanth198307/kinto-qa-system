-- =====================================================
-- DIAGNOSTIC: Check what columns actually exist
-- =====================================================

\echo '========== PRODUCT_CATEGORIES COLUMNS =========='
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'product_categories' 
ORDER BY ordinal_position;

\echo ''
\echo '========== PRODUCT_TYPES COLUMNS =========='
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'product_types' 
ORDER BY ordinal_position;

\echo ''
\echo '========== RAW_MATERIAL_TYPES COLUMNS =========='
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'raw_material_types' 
ORDER BY ordinal_position;

\echo ''
\echo '========== DONE =========='
