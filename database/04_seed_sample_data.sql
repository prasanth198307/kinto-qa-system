-- KINTO QA Management System - Sample Data (Optional)
-- Uncomment sections below to insert sample data for testing

-- =====================================================
-- SAMPLE MACHINE TYPES
-- =====================================================
/*
INSERT INTO machine_types (name, description, category) VALUES
('CNC Lathe', 'Computer Numerical Control Lathe Machine', 'Machining'),
('Injection Molding', 'Plastic Injection Molding Machine', 'Molding'),
('Assembly Robot', 'Automated Assembly Robot Arm', 'Robotics'),
('Quality Scanner', '3D Quality Inspection Scanner', 'Inspection')
ON CONFLICT (name) DO NOTHING;
*/

-- =====================================================
-- SAMPLE MACHINES
-- =====================================================
/*
INSERT INTO machines (name, type, location, status, installation_date) VALUES
('CNC-001', 'CNC Lathe', 'Production Floor A', 'active', '2023-01-15'),
('CNC-002', 'CNC Lathe', 'Production Floor A', 'active', '2023-02-20'),
('INJ-001', 'Injection Molding', 'Production Floor B', 'active', '2023-03-10'),
('ROB-001', 'Assembly Robot', 'Assembly Line 1', 'active', '2023-04-05'),
('QS-001', 'Quality Scanner', 'QC Department', 'active', '2023-05-12');
*/

-- =====================================================
-- SAMPLE SPARE PARTS
-- =====================================================
/*
INSERT INTO spare_parts_catalog (part_name, part_number, category, unit_price, reorder_threshold, current_stock) VALUES
('Hydraulic Oil Filter', 'HYD-FILT-001', 'Filters', 25.50, 10, 15),
('Spindle Bearing', 'SPIN-BEAR-A12', 'Bearings', 150.00, 5, 8),
('Motor Belt', 'BELT-MT-500', 'Belts', 45.00, 8, 12),
('Coolant Pump', 'COOL-PMP-X5', 'Pumps', 320.00, 3, 5),
('Pneumatic Cylinder', 'PNEU-CYL-50', 'Pneumatics', 180.00, 4, 6);
*/

-- =====================================================
-- SAMPLE PM TASK LIST TEMPLATES
-- =====================================================
/*
INSERT INTO pm_task_list_templates (name, description, machine_type, estimated_duration_minutes) VALUES
('CNC Lathe Weekly PM', 'Weekly preventive maintenance for CNC Lathe machines', 'CNC Lathe', 45),
('Injection Molding Monthly PM', 'Monthly preventive maintenance for injection molding machines', 'Injection Molding', 90),
('Robot Quarterly PM', 'Quarterly preventive maintenance for assembly robots', 'Assembly Robot', 120);
*/

-- =====================================================
-- SAMPLE USERS (Additional test users)
-- =====================================================
/*
-- Note: These passwords are hashed with scrypt
-- For production, use the admin interface to create users

INSERT INTO users (username, password, email, first_name, last_name, role_id)
SELECT 'operator1', 'hashed_password_here', 'operator1@kinto.com', 'John', 'Smith', roles.id
FROM roles WHERE roles.name = 'operator'
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, email, first_name, last_name, role_id)
SELECT 'reviewer1', 'hashed_password_here', 'reviewer1@kinto.com', 'Sarah', 'Johnson', roles.id
FROM roles WHERE roles.name = 'reviewer'
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, email, first_name, last_name, role_id)
SELECT 'manager1', 'hashed_password_here', 'manager1@kinto.com', 'Michael', 'Brown', roles.id
FROM roles WHERE roles.name = 'manager'
ON CONFLICT (username) DO NOTHING;
*/
