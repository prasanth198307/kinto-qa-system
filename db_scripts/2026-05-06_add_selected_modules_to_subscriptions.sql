-- Add per-tenant module selection columns to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS selected_modules JSONB DEFAULT '[]';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS monthly_amount INTEGER DEFAULT 0;
