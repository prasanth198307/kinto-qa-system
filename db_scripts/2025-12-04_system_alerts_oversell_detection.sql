-- System Alerts Table for Lightweight Oversell Detection
-- Created: 2025-12-04
-- Purpose: Stores system alerts for admin visibility when reserved inventory exceeds physical stock

-- Create system_alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    alert_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id),
    record_status INTEGER NOT NULL DEFAULT 1
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_system_alerts_alert_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_entity ON system_alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_detected_at ON system_alerts(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_active ON system_alerts(status) WHERE status = 'active';

-- Add comments for documentation
COMMENT ON TABLE system_alerts IS 'Stores system-level alerts for admin visibility, including oversell detection warnings';
COMMENT ON COLUMN system_alerts.alert_type IS 'Type of alert: oversell, inventory_low, etc.';
COMMENT ON COLUMN system_alerts.entity_type IS 'Entity type the alert relates to: product, invoice, etc.';
COMMENT ON COLUMN system_alerts.entity_id IS 'ID of the related entity';
COMMENT ON COLUMN system_alerts.severity IS 'Alert severity: info, warning, critical';
COMMENT ON COLUMN system_alerts.details IS 'JSON object with additional alert data (e.g., physical_stock, reserved_quantity, shortage)';
COMMENT ON COLUMN system_alerts.status IS 'Alert status: active, acknowledged, resolved';

-- Example of how alerts are created (for documentation):
-- When an invoice is created and total reserved quantity > physical stock:
-- INSERT INTO system_alerts (alert_type, entity_type, entity_id, severity, title, message, details)
-- VALUES (
--     'oversell',
--     'product',
--     '123',
--     'warning',
--     'Potential Oversell Detected',
--     'Product XYZ has 100 units physical stock but 120 units reserved across pending invoices',
--     '{"physical_stock": 100, "reserved_quantity": 120, "shortage": 20, "triggering_invoice_id": "abc-123"}'::jsonb
-- );
