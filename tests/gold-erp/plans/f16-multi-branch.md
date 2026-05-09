# F16 — Multi-Branch Operations: Warehouses → Stock Transfer → UOM Conversion
# NOTE: The original F16 plan referenced "In Transit → Receive" two-step transfer flow,
# Branch POS sale with branch selection, and consolidated branch analytics — none of which
# are implemented in the current Warehouses module.
# The actual module has a single-step "Complete Transfer" flow (status=completed immediately).
# This revised plan covers what is actually built.
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Create Head Office Warehouse
4. [Browser] Navigate to /warehouses
5. [Verify] Assert "Warehouses & Stock" page heading visible
6. [Browser] Click "Add Warehouse"
7. [Browser] Fill Name: "Head Office", Code: "HO", City: "Hyderabad", State: "Telangana"
8. [Browser] Check "Set as default warehouse"
9. [Browser] Click Save
10. [Verify] Assert warehouse card for "Head Office" appears

## PHASE 2: Create Branch Warehouse
11. [Browser] Click "Add Warehouse"
12. [Browser] Fill Name: "Banjara Hills Branch", Code: "BH", City: "Hyderabad", State: "Telangana"
13. [Browser] Click Save
14. [Verify] Assert warehouse card for "Banjara Hills Branch" appears
15. [Verify] Assert total warehouse cards >= 2

## PHASE 3: Create Stock Transfer HO → Branch
16. [Browser] Click "Stock Transfers" tab
17. [Browser] Click "New Transfer"
18. [Browser] Select "Head Office" as From Warehouse
19. [Browser] Select "Banjara Hills Branch" as To Warehouse
20. [Browser] Fill Reference No: "DW-2026-001"
21. [Browser] Click "Complete Transfer"
22. [Verify] Assert transfer card shows "Head Office → Banjara Hills Branch"
23. [Verify] Assert transfer card shows status "completed"
24. [Verify] Assert reference "DW-2026-001" visible

## PHASE 4: UOM Conversions
25. [Browser] Click "UOM Conversions" tab
26. [Browser] Click "Add Conversion"
27. [Browser] Fill From=kg, Factor=1000, To=g
28. [Browser] Click Save
29. [Verify] Assert UOM row "1 kg = 1000 g" visible
30. [Browser] Click "Add Conversion" again
31. [Browser] Fill From=tola, Factor=11.664, To=g
32. [Browser] Click Save
33. [Verify] Assert "tola" and "11.664" visible in conversions table

## PHASE 5: Edit Warehouse
34. [Browser] Click "Warehouses" tab
35. [Browser] Click Edit on Head Office card
36. [Browser] Fill Address: "Road No 12, Banjara Hills"
37. [Browser] Click Save
38. [Verify] Assert dialog closes (address saved)
39. [Verify] Assert 2 warehouse cards still exist (HO + Branch)
