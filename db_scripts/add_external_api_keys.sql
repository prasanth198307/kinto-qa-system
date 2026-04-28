-- External API Keys for OAuth-style access to customer outstanding endpoint
CREATE TABLE IF NOT EXISTS external_api_keys (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  name varchar(100) NOT NULL,
  key_hash varchar(64) NOT NULL,
  is_active integer DEFAULT 1 NOT NULL,
  created_by varchar,
  created_at timestamp DEFAULT now(),
  last_used_at timestamp
);
CREATE INDEX IF NOT EXISTS ext_api_keys_tenant_idx ON external_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS ext_api_keys_hash_idx ON external_api_keys(key_hash);
