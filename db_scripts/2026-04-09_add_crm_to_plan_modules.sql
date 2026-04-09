-- Add CRM module to professional and enterprise subscription plans
-- CRM was implemented but missing from the subscription_plans.modules JSON arrays,
-- meaning professional tenants couldn't see CRM leads despite subscribing to it.

UPDATE subscription_plans
SET modules = modules || '["crm"]'::jsonb
WHERE slug IN ('professional', 'enterprise')
  AND NOT (modules @> '["crm"]'::jsonb);
