-- Phase 13: Logistics GPS Tracking, Route Optimization, Vehicle Maintenance
-- Phase 14: Real Estate RERA Submissions, Broker Commissions

-- GPS Positions for vehicle tracking
CREATE TABLE IF NOT EXISTS logistics_gps_positions (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  vehicle_no VARCHAR(50),
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  speed DECIMAL(6,2) DEFAULT 0,
  heading DECIMAL(5,2) DEFAULT 0,
  engine_status VARCHAR(20) DEFAULT 'unknown',
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  source VARCHAR(30) DEFAULT 'manual'
);
CREATE INDEX IF NOT EXISTS idx_lgps_vehicle_time ON logistics_gps_positions(vehicle_id, recorded_at DESC);

-- Geofences for vehicle alerts
CREATE TABLE IF NOT EXISTS logistics_geofences (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  vehicle_id INT,
  name VARCHAR(200),
  lat DECIMAL(10,7),
  lon DECIMAL(10,7),
  radius_km DECIMAL(8,3) DEFAULT 1,
  alert_on_enter BOOLEAN DEFAULT TRUE,
  alert_on_exit BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimized routes storage
CREATE TABLE IF NOT EXISTS logistics_routes (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  vehicle_type VARCHAR(30),
  waypoints JSONB,
  optimized_waypoints JSONB,
  total_distance_km DECIMAL(10,2),
  estimated_time_mins INT,
  source VARCHAR(30) DEFAULT 'heuristic',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle maintenance records (Phase 13 structured table)
CREATE TABLE IF NOT EXISTS logistics_vehicle_maintenance (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  maintenance_date DATE NOT NULL,
  maintenance_type VARCHAR(100),
  description TEXT,
  cost DECIMAL(12,2) DEFAULT 0,
  vendor_name VARCHAR(200),
  next_service_date DATE,
  next_service_km INT,
  odometer_reading INT,
  status VARCHAR(30) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RERA quarterly submissions
CREATE TABLE IF NOT EXISTS re_rera_submissions (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  project_id INT NOT NULL,
  year INT NOT NULL,
  quarter INT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(30) DEFAULT 'submitted',
  report_data JSONB,
  submission_no VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Broker commission tracking
CREATE TABLE IF NOT EXISTS re_broker_commissions (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  broker_id INT NOT NULL,
  booking_id INT,
  commission_amount DECIMAL(15,2) DEFAULT 0,
  commission_pct DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'pending',
  paid_date DATE,
  gl_posted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
