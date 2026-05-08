# F7 — Karigar Settlement Math (verify pre-seeded row)
# Pre-seeded: jw_settlement row id=2, tenant_id=13, issued=17g, received=16.2g, net_payable=4502.20

1. [New Context] Create a new browser context
2. [Browser] Navigate to /auth
3. [Browser] Fill "gold-erp-demo" in Company ID, "goldadmin" in Username, "Gold@1234" in Password, click Sign In
4. [Verify] Assert URL is NOT /auth (successfully redirected to dashboard)
5. [Browser] Navigate to /gold-erp?section=settlement
6. [Verify] Assert "Karigar Settlement" heading is visible on the page
7. [DB] Run query: SELECT id, gold_issued_gm, gold_received_gm, excess_wastage_gm, net_payable FROM jw_settlement WHERE tenant_id=13 ORDER BY id DESC LIMIT 1 — assert net_payable is approximately 4502.20 and issued=17.000 and received=16.200
8. [Verify]
   - Assert the settlement table on screen shows a row
   - Assert the row has a green-highlighted Net Payable value near ₹4,502
   - Assert the Excess Wastage column shows a value in red (0.29 g excess)
