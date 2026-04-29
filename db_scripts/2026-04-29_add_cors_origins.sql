-- Add cors_origins column to tenants for per-tenant CORS whitelisting
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cors_origins text[] DEFAULT '{}';
