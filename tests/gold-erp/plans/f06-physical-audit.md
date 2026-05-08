# F6 — Physical Inventory Audit — Missing Item Detection
# Barcode scan all showcase items → 1 missing item → discrepancy report → investigation action
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Start Physical Audit
4. [Browser] Navigate to Physical Audit (path: /gold-erp?section=physical-audit)
5. [Verify] Assert Physical Audit screen is visible
6. [Browser] Click "+ Start New Audit" or "New Physical Count" button
7. [Browser] Fill "Showcase Audit — Main Counter" in Audit Name or Description
8. [Browser] Set date to today
9. [Browser] Click Start / Create

## PHASE 2: Scan / Enter Items
10. [Browser] Look for a barcode input or item entry field
11. [Browser] Enter item tag "DT-0042" in the scan/entry field and press Enter or click Add
12. [Verify] Assert DT-0042 appears in the scanned items list (22K Necklace, 16.2gm)
13. [Browser] Enter item tag "DT-0043" in the scan field
14. [Verify] Assert DT-0043 appears in the list
15. [Browser] Enter item tag "DT-0044" in the scan field
16. [Verify] Assert DT-0044 appears in the list
17. [Browser] Enter item tag "DT-0055" in the scan field
18. [Verify] Assert DT-0055 appears in the list
19. [Browser] Skip / do NOT enter "DT-0048" — this item will be the missing one

## PHASE 3: Close Audit and Check Discrepancy
20. [Browser] Click "Close Audit" or "Finalize Count" button
21. [Verify]
    - Assert audit summary shows total items scanned
    - Assert a discrepancy or "missing items" section appears
    - Assert DT-0048 (or any item in system not scanned) is flagged as Missing

## PHASE 4: Investigation Action
22. [Browser] Click on the discrepancy/missing item row
23. [Browser] Fill "Under investigation — checking with counter staff" in Investigation Notes field if available
24. [Browser] Click Save or Record Action
25. [Verify]
    - Assert discrepancy record is saved
    - Assert audit report shows date, auditor, total items, missing count, and discrepancy value
26. [Verify] Assert the audit is in "Closed" or "Completed" status with discrepancy noted
