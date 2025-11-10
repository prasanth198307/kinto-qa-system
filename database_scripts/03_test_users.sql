-- KINTO QA Management System - Test Users for E2E Testing
-- Version: 1.0.0
-- Date: 2025-11-10
-- Purpose: Create test users with known credentials for automated testing

-- ===========================================
-- TEST USER CREDENTIALS
-- ===========================================
-- All test users use password: Test@123
-- Password hash generated using scrypt algorithm

-- Test Admin (already exists in seed data)
-- Username: admin
-- Password: Admin@123
-- Email: admin@kinto.com

-- ===========================================
-- TEST MANAGER USER
-- ===========================================
-- Username: manager_test
-- Password: Test@123

INSERT INTO users (id, username, password, email, first_name, last_name, mobile_number, role_id, record_status) VALUES
(
    'user-test-manager',
    'manager_test',
    '$2b$10$YPKDelYQbAp7FzNPZpKEL.bqOvH6hCJ9EKW2UP5fJZzr4r.0sEZUO',
    'manager.test@kinto.com',
    'Test',
    'Manager',
    '9876543210',
    'role-manager',
    1
)
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    email = EXCLUDED.email,
    mobile_number = EXCLUDED.mobile_number;

-- ===========================================
-- TEST OPERATOR USER
-- ===========================================
-- Username: operator_test
-- Password: Test@123

INSERT INTO users (id, username, password, email, first_name, last_name, mobile_number, role_id, record_status) VALUES
(
    'user-test-operator',
    'operator_test',
    '$2b$10$YPKDelYQbAp7FzNPZpKEL.bqOvH6hCJ9EKW2UP5fJZzr4r.0sEZUO',
    'operator.test@kinto.com',
    'Test',
    'Operator',
    '9876543211',
    'role-operator',
    1
)
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    email = EXCLUDED.email,
    mobile_number = EXCLUDED.mobile_number;

-- ===========================================
-- TEST REVIEWER USER
-- ===========================================
-- Username: reviewer_test
-- Password: Test@123

INSERT INTO users (id, username, password, email, first_name, last_name, mobile_number, role_id, record_status) VALUES
(
    'user-test-reviewer',
    'reviewer_test',
    '$2b$10$YPKDelYQbAp7FzNPZpKEL.bqOvH6hCJ9EKW2UP5fJZzr4r.0sEZUO',
    'reviewer.test@kinto.com',
    'Test',
    'Reviewer',
    '9876543212',
    'role-reviewer',
    1
)
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    email = EXCLUDED.email,
    mobile_number = EXCLUDED.mobile_number;

-- ===========================================
-- VERIFICATION QUERY
-- ===========================================
-- Run this to verify all test users are created:
-- SELECT u.username, u.email, r.name as role 
-- FROM users u 
-- JOIN roles r ON u.role_id = r.id 
-- WHERE u.username LIKE '%test%' OR u.username = 'admin';
