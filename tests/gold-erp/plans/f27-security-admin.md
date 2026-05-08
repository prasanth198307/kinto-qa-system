# F27 — Security Admin: MFA → IP Allowlist → Session Management → Role Lock → Audit Compliance
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Role-Based Access Control Verification
4. [Browser] Navigate to Settings → Roles (path: /settings?tab=roles)
5. [Verify] Assert all roles are listed: Admin, Manager, Staff, Counter Staff (if created in F25)
6. [Browser] Open the "Counter Staff" role (or any non-admin role)
7. [Verify]
    - Assert sensitive modules (Settings, Payroll, Audit Trail) have can_view: 0
    - Assert Jewellery POS has can_view: 1, can_create: 1
    - Assert can_delete: 0 for all modules for Counter Staff

## PHASE 2: Create Restricted User
8. [Browser] Navigate to Admin Users or Company Users section
9. [Browser] Click "+ Add User" or invite user
10. [Browser] Fill "Ramesh Counter" in Name
11. [Browser] Fill "ramesh@goldshop.com" in Email
12. [Browser] Fill "Counter@1234" in Password
13. [Browser] Assign "Counter Staff" role
14. [Browser] Click Save / Invite
15. [Verify] Assert user "Ramesh Counter" created with Counter Staff role

## PHASE 3: Test Restricted Access
16. [Browser] Open an incognito/new context window
17. [New Context] Create a new browser context for the restricted user test
18. [Browser] Navigate to /auth
19. [Browser] Sign in as gold-erp-demo / ramesh@goldshop.com / Counter@1234
20. [Verify] Assert login succeeds and restricted dashboard is visible
21. [Browser] Try to navigate to Settings (path: /settings)
22. [Verify] Assert either:
    - Settings is not shown in sidebar
    - OR Settings page shows "Access Denied" / permission error
23. [Browser] Try to navigate to Audit Trail (path: /audit-trail)
24. [Verify] Assert Audit Trail is blocked / not accessible for Counter Staff
25. [Browser] Navigate to Jewellery POS (path: /gold-erp?section=jewellery-pos)
26. [Verify] Assert Jewellery POS IS accessible for Counter Staff

## PHASE 4: Session Management (Back to Admin)
27. [New Context] Create a new browser context (admin)
28. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
29. [Browser] Navigate to Session Management or Active Users section in Settings
30. [Verify]
    - Assert active sessions are listed (goldadmin's current session + Ramesh Counter's session)
    - Assert session details show IP, login time, browser/device

31. [Browser] Click "Terminate" or "Log Out" next to Ramesh Counter's session
32. [Verify] Assert Ramesh Counter's session is terminated
33. [Browser] Switch to the Ramesh Counter context (from Phase 3) and try to navigate
34. [Verify] Assert Ramesh Counter is logged out / redirected to login

## PHASE 5: Audit Trail — Security Actions
35. [Browser] Navigate to Audit Trail (path: /audit-trail) as admin
36. [Verify]
    - Assert audit log shows recent security events:
      - Role creation (Counter Staff)
      - User creation (Ramesh Counter)
      - Login events for both users
      - Session termination event
    - Assert each log entry shows: actor, action, entity, timestamp, IP address

## PHASE 6: CORS Origins Management
37. [Browser] Navigate to Super Admin (path: /admin/tenants) — this requires super-admin access
38. [Verify] Assert tenants list is visible (only if goldadmin has super-admin access)
39. [Browser] If super-admin access available: Find gold-erp-demo tenant and click "CORS Origins"
40. [Verify] Assert CORS origins management dialog is visible
41. [Browser] Add "https://golderpdemo.com" as a CORS origin
42. [Verify] Assert CORS origin saved successfully
43. [Browser] Remove the test CORS origin to clean up
44. [Verify] Assert CORS origin removed

## PHASE 7: Approval Workflow for Sensitive Operations
45. [Browser] Navigate to Approvals (path: /approvals)
46. [Verify] Assert Approval Inbox shows all pending items
47. [Browser] Navigate to Approval Rules in Settings if available
48. [Verify]
    - Assert approval rules exist for: Purchase Orders over ₹1L, Expense Claims over ₹5,000
    - OR: Assert approval inbox shows items waiting for goldadmin's approval

## PHASE 8: Data Security — Tenant Isolation
49. [Browser] Navigate to Company selection (path: /company-select)
50. [Verify]
    - Assert only the gold-erp-demo company is shown for goldadmin (tenant isolation)
    - Assert no cross-tenant data is exposed
51. [Verify] Assert the URL always includes tenant context and all API calls use the correct tenant_id
