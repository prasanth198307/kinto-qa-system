# F14 — Multi-Stage Production: 18K Ring — Core Flow
# Covers: Order → Sketch → CAD → CAM → Ghat → Finalize → Settlement
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard or any logged-in page loads

## STEP 1: Create Production Order
4. [Browser] Navigate to /gold-erp?section=production
5. [Browser] Click "+ New Order" button
6. [Browser] Fill: Metal=Gold, Purity=18K (750), Qty=1, Issued Weight=5.0, Target Date=any future date
7. [Browser] Click "Create Order" or Save
8. [Verify] Assert a new production order card appears (note its order number e.g. PRD-XXXXXXXXX)

## STEP 2: Add Sketch
9. [Browser] Navigate to /gold-erp?section=sketch
10. [Browser] Click "Add Sketch"
11. [Browser] Select your new production order from the Production Order dropdown
12. [Browser] Fill Customer Brief: "Ring sketch approved"
13. [Browser] Click Save
14. [Verify] Assert sketch record appears in the table

## STEP 3: Add CAD Record
15. [Browser] Navigate to /gold-erp?section=cad
16. [Browser] Click "Add CAD" button
17. [Browser] Select your production order from the Production order dropdown
18. [Browser] Fill CAD Operator: "Test Operator"
19. [Browser] Select CAD Software: "Matrix"
20. [Browser] Fill Weight estimate: 4.2
21. [Browser] Click the "Approved" button in Customer approval status
22. [Browser] Click "Save draft"
23. [Verify] Assert a CAD row appears in the table for your order

## STEP 4: Add CAM Record
24. [Browser] Navigate to /gold-erp?section=cam
25. [Browser] Click "Add CAM" button
26. [Browser] Select your production order
27. [Browser] Fill CAM Operator: "Test Operator", Estimated Hours: 2, Actual Hours: 2.5, Prototype Weight: 4.2
28. [Browser] Check the QC Passed checkbox
29. [Browser] Click Save
30. [Verify] Assert a CAM row appears in the table

## STEP 5: Ghat / Casting Wastage Entry
31. [Browser] Navigate to /gold-erp?section=ghat
32. [Browser] Click "+ Add Entry"
33. [Browser] Select your production order, Stage: Casting, Issued: 5.0, Received: 4.7
34. [Browser] Click "Save Entry"
35. [Verify] Assert ghat row appears showing Issued 5.000 g, Received 4.700 g, Wastage 0.300 g (alert icon is expected since 6% > 5% threshold)

## STEP 6: Finalize Job
36. [Browser] Navigate to /gold-erp?section=finalize
37. [Browser] Click "Finalize Job"
38. [Browser] Select your production order
39. [Browser] Fill Final Weight: 4.2, check QC Passed and Move to Stock checkboxes
40. [Browser] Click "Finalize"
41. [Verify] Assert finalized record appears with Final Wt 4.200 g and QC Passed ✓

## STEP 7: Karigar Settlement
42. [Browser] Navigate to /gold-erp?section=settlement
43. [Browser] Click "New Settlement"
44. [Browser] Select your production order from Production Order dropdown
45. [Browser] Select first available karigar from Karigar dropdown
46. [Browser] Fill: Gold Issued=5.0, Gold Received=4.2, Allowable Wastage%=5, Gold Rate=5640, Wage Amount=1680
47. [Browser] Click "Record Settlement"
48. [Verify] Assert settlement row appears with:
    - Issued: 5.000 g
    - Received: 4.200 g
    - Excess Wastage: 0.550 g
    - Wage: ₹1,680
    - Deduction: -₹3,102
    - Net Payable: ₹-1,422
