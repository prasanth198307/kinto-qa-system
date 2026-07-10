-- Grant all newly added screen permissions to admin roles for all tenants
-- Covers: Real Estate (rera/demand-letters/project-pl), Hotel (banquet/channel-manager/revenue-management),
--         Logistics (live-gps/route-optimization), Agriculture (mandi-prices/pmfby),
--         CRM (customer-360/drip-campaigns/lead-scoring), Education (certificates/nep-compliance),
--         Ecommerce (warehouses), Pharmacy (e-invoice/narcotics-register),
--         Masters sub-pages (tax-config/hsn-codes/sac-codes/branches/bank-master etc.)

DO $$
DECLARE
  r RECORD;
  new_screens TEXT[] := ARRAY[
    'real_estate_rera', 'real_estate_demand_letters', 'real_estate_project_pl',
    'hotel_banquet', 'hotel_channel_manager', 'hotel_revenue_management',
    'logistics_live_gps', 'logistics_route_optimization',
    'agriculture_mandi_prices', 'agriculture_pmfby',
    'crm_customer_360', 'crm_drip_campaigns', 'crm_lead_scoring',
    'education_certificates', 'education_nep_compliance',
    'ecommerce_warehouses',
    'pharmacy_e_invoice', 'pharmacy_narcotics_register',
    'masters_tax_config', 'masters_hsn_codes', 'masters_sac_codes',
    'masters_branches', 'masters_bank_master', 'masters_doc_numbering',
    'masters_email_templates', 'masters_sms_templates', 'masters_webhooks',
    'masters_integration_credentials', 'masters_feature_flags',
    'masters_approval_matrix', 'masters_print_templates', 'masters_states_countries'
  ];
  screen_key TEXT;
BEGIN
  -- For each admin role_id in each tenant, insert missing permission rows
  FOREACH screen_key IN ARRAY new_screens LOOP
    INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete, tenant_id)
    SELECT rp.role_id, screen_key, true, true, true, true, rp.tenant_id
    FROM (SELECT DISTINCT role_id, tenant_id FROM role_permissions WHERE can_view = true) rp
    WHERE NOT EXISTS (
      SELECT 1 FROM role_permissions rp2
      WHERE rp2.role_id = rp.role_id AND rp2.screen_key = screen_key AND rp2.tenant_id = rp.tenant_id
    );
  END LOOP;
END $$;
