# F25 — Admin & Settings: Company Info → Roles & Permissions → Module Labels → Custom Fields → Subscription
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Company Information Settings
4. [Browser] Navigate to Company Settings (path: /settings)
5. [Verify] Assert Settings page is visible with multiple tabs
6. [Browser] Click the "Company" tab if not default
7. [Browser] Find the Company Name field and verify "Gold ERP Demo" or similar
8. [Browser] Update GSTIN to "36AABCG5432L1Z5" if empty or update it
9. [Browser] Fill address: "123 Jewellers Lane, Hyderabad, Telangana 500001"
10. [Browser] Click Save
11. [Verify] Assert company settings saved with success toast

## PHASE 2: Logo & Branding
12. [Browser] Look for Logo upload section in Settings
13. [Verify] Assert logo upload area is visible (even if upload not performed in automation)
14. [Verify] Assert company name reflects on the top-left of the sidebar/header

## PHASE 3: Roles & Permissions
15. [Browser] Navigate to Roles section within Settings or directly (path: /settings?tab=roles)
16. [Verify] Assert Roles screen shows existing roles (Admin, Manager, Staff, etc.)
17. [Browser] Click "+ Add Role" or Create Role
18. [Browser] Fill "Counter Staff" in Role Name
19. [Browser] Set permissions:
    - Jewellery POS → can_view: 1, can_create: 1, can_edit: 0, can_delete: 0
    - Karigar section → can_view: 1, can_create: 0, can_edit: 0, can_delete: 0
    - Settings → can_view: 0, can_create: 0, can_edit: 0, can_delete: 0
20. [Browser] Click Save
21. [Verify] Assert "Counter Staff" role created with limited permissions

## PHASE 4: Module Labels (rename a module)
22. [Browser] Navigate to Module Labels tab in Company Settings (path: /settings?tab=module-labels)
23. [Verify] Assert Module Labels configuration screen is visible
24. [Browser] Find the "Karigar" module label and change it to "Artisan"
25. [Browser] Click Save
26. [Verify]
    - Assert sidebar shows "Artisan" instead of "Karigar"
27. [Browser] Revert the label back to "Karigar" and save
28. [Verify] Assert sidebar shows "Karigar" again

## PHASE 5: Custom Fields
29. [Browser] Navigate to Custom Fields tab in Settings (path: /settings?tab=custom-fields)
30. [Verify] Assert Custom Fields configuration is visible
31. [Browser] Click "+ Add Custom Field"
32. [Browser] Select "Invoice" as entity type
33. [Browser] Fill "Customer's Special Note" in Field Label
34. [Browser] Select "Text" as field type
35. [Browser] Click Save
36. [Verify] Assert custom field "Customer's Special Note" added to Invoice entity
37. [Browser] Navigate to any Invoice to verify custom field appears at the bottom of the form
38. [Verify] Assert "Customer's Special Note" text field is visible on the invoice form

## PHASE 6: Subscription Management
39. [Browser] Navigate to Subscription Management (path: /subscription-management)
40. [Verify]
    - Assert Subscription Management page loads with tabs: Overview, Module Marketplace, Manage Modules, Auto-Deduct, Billing History
    - Assert current plan is shown (gold_erp_plan or similar)
    - Assert Monthly cost is shown

41. [Browser] Click "Module Marketplace" tab
42. [Verify]
    - Assert module grid is visible with categories (Core, Finance, Inventory, Production, HR, Sales, Industry)
    - Assert modules are grouped by category
    - Assert active modules are pre-checked/highlighted

43. [Browser] Click "Billing History" tab
44. [Verify] Assert billing events/history is shown (may be empty for new tenant)

## PHASE 7: Audit Trail
45. [Browser] Navigate to Audit Trail (path: /audit-trail)
46. [Verify]
    - Assert Audit Trail page is visible
    - Assert recent actions (from this test session's data changes) appear as log entries
    - Assert filter by entity type works (select "Invoice" entity type)
    - Assert log entries show actor (goldadmin), action type, timestamp
