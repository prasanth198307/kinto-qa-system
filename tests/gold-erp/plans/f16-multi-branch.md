# F16 — Multi-Branch Operations: Stock Transfer HO→Branch → In-Transit Lock → Receive → Branch POS Sale
# NOTE: Requires warehouse/multi-location setup. Uses the Warehouses module.
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Setup Warehouses (if not already existing)
4. [Browser] Navigate to Warehouses (path: /warehouses)
5. [Verify] Assert Warehouses screen is visible
6. [Browser] Ensure at least 2 warehouses exist — "Head Office" and "Banjara Hills Branch"
7. [Browser] If missing, click "+ Add Warehouse"
8. [Browser] Fill "Banjara Hills Branch" in Name, "Hyderabad — Banjara Hills showroom" in address
9. [Browser] Click Save
10. [Verify] Assert both Head Office and Banjara Hills Branch warehouses exist

## PHASE 2: Initiate Stock Transfer HO → Branch
11. [Browser] Navigate to Stock Transfers within Warehouses or Inventory
12. [Browser] Click "+ New Transfer"
13. [Browser] Select "Head Office" as Source Warehouse
14. [Browser] Select "Banjara Hills Branch" as Destination Warehouse
15. [Browser] Add transfer items:
    - Item "DT-0042" (22K Necklace, 16.2gm) — quantity 1
    - Item "DT-0044" (if exists) — quantity 1
16. [Browser] Fill transfer notes "Diwali stock replenishment — Banjara Hills"
17. [Browser] Click Save / Initiate Transfer
18. [Verify]
    - Assert stock transfer created with status "In Transit"
    - Assert items are locked / reserved in HO stock (not available for sale from HO)

## PHASE 3: Receive at Branch
19. [Browser] Update transfer status to "Received" or click "Confirm Receipt"
20. [Browser] Fill "Branch received in good condition" in receipt notes
21. [Browser] Set received date to today
22. [Browser] Click Save
23. [Verify]
    - Assert transfer status = Received
    - Assert items now appear in Banjara Hills Branch inventory
    - Assert items removed from Head Office stock

## PHASE 4: Branch POS Sale
24. [Browser] Navigate to Jewellery POS (path: /gold-erp?section=jewellery-pos)
25. [Browser] Create a new sale
26. [Browser] Select "Banjara Hills Branch" as the billing location/branch if that option exists
27. [Browser] Add item "DT-0042" to the bill
28. [Browser] Add customer "Walk-in Customer"
29. [Browser] Complete the sale
30. [Verify]
    - Assert sale created for ₹1,11,473 approximately
    - Assert DT-0042 stock deducted from Banjara Hills Branch (not HO)

## PHASE 5: Consolidated Analytics Check
31. [Browser] Navigate to MIS or Analytics (path: /mis)
32. [Verify]
    - Assert analytics shows sales data consolidating across both HO and Branch
    - Assert Banjara Hills Branch sales visible in the report
