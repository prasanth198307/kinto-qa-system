-- KINTO QA Management System - Default Admin User
-- Creates the default admin user with secure password
-- 
-- DEFAULT CREDENTIALS:
-- Username: admin
-- Password: Admin@123
-- 
-- IMPORTANT: Change this password immediately after first login!

-- Insert admin user with hashed password
INSERT INTO users (username, password, email, first_name, last_name, role_id)
SELECT 
    'admin',
    -- Password: Admin@123 (hashed with scrypt)
    'a764c3658035dc0fef29f76916332c2a15431966992cbd754e63c68b300398e3eed32fa36b8e0b60c20ffc754d3012bcc9b055ff46c1dab3cf0e93230f117809.bcc161776a46f4c54bb841be4ed473f4',
    'admin@kinto.com',
    'System',
    'Administrator',
    roles.id
FROM roles 
WHERE roles.name = 'admin'
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    role_id = EXCLUDED.role_id,
    updated_at = NOW();

-- Verify admin user was created
SELECT 
    u.id,
    u.username,
    u.email,
    r.name as role,
    u.created_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.username = 'admin';
