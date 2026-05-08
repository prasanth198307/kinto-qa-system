# F8 — Metal Ledger: Customer Gold Custody (verify pre-seeded + add new)
# Pre-seeded: 2 rows for "Meena Reddy" — receipt 20g, issue 16.2g, balance 3.8g

1. [New Context] Create a new browser context
2. [Browser] Navigate to /auth
3. [Browser] Fill "gold-erp-demo" in Company ID, "goldadmin" in Username, "Gold@1234" in Password, click Sign In
4. [Verify] Assert URL is NOT /auth
5. [Browser] Navigate to /gold-erp?section=metal-ledger
6. [Verify] Assert "Metal Ledger" heading visible
7. [DB] Run query: SELECT customer_name, transaction_type, weight_gm, balance_gm FROM jw_metal_ledger WHERE tenant_id=13 ORDER BY id ASC — assert there are rows for "Meena Reddy" with receipt=20.0 and issue=16.2 and a balance of 3.8
8. [Verify]
   - Assert the Metal Ledger table shows rows for Meena Reddy
   - Assert one row shows transaction_type "receipt" or "Inward" with weight 20.0 g
   - Assert another row shows type "issue" or "Outward" with weight 16.2 g
9. [Browser] Click [data-testid="button-add-metal-txn"]
10. [Verify] Assert dialog or form opens for new transaction
11. [Browser] Fill "Test Customer" in [data-testid="input-ledger-customer"], fill "5.0" in [data-testid="input-ledger-weight"]
12. [Browser] Click [data-testid="button-save-metal-ledger"]
13. [Verify] Assert a success toast appears
