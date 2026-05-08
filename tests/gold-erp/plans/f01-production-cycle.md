# F1 — Complete Production Cycle (DS-NK-001 Necklace)
# Production Order → Sketch → CAD → CAM → Ghat → Finalize → Settlement
# PRE-REQ: Raju Goldsmith karigar and 22K metal rate must exist
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth
3. [Browser] Fill "gold-erp-demo" in Company ID, "goldadmin" in username, "Gold@1234" in password
4. [Browser] Click Sign In
5. [Verify] Assert dashboard loads (not /auth)

## PHASE 1: Production Order
6. [Browser] Navigate to /gold-erp?section=production
7. [Verify] Assert "Production Orders" heading is visible
8. [Browser] Click the "+ New Order" button (or any button that opens the new production order form)
9. [Browser] Select "Raju Goldsmith" in the Karigar dropdown
10. [Browser] Select "Gold" in Metal dropdown
11. [Browser] Select "22K (916)" in Purity dropdown
12. [Browser] Fill "1" in the Quantity field
13. [Browser] Fill "17.0" in the Gold to Issue (gm) field
14. [Browser] Set target completion date to any future date
15. [Browser] Click Save
16. [Verify]
    - Assert a production order row is created (order number like PRD-xxx)
    - Assert stage badge shows "planning" — THIS IS CORRECT, not a bug
    - Note the exact PRD-xxx order number for later phases

## PHASE 2: Sketch Stage
17. [Browser] Navigate to /gold-erp?section=sketch
18. [Verify] Assert "Sketch Process" heading is visible
19. [Browser] Click "+ Add Sketch" button
20. [Browser] Select the PRD-xxx order from the Production Order dropdown
21. [Browser] Fill "Plain necklace design" in Customer Brief textarea
22. [Browser] Fill "https://example.com/sketch.jpg" in Sketch Image URL field
23. [Browser] Fill "Necklace" in Design Category field
24. [Browser] Click Save
25. [Verify] Assert sketch record appears in the table for PRD-xxx

## PHASE 3: CAD Process
26. [Browser] Navigate to /gold-erp?section=cad
27. [Browser] Click button with data-testid="button-add-cad"
28. [Browser] Click trigger with data-testid="select-cad-order" and select the PRD-xxx order
29. [Browser] Click trigger with data-testid="select-cad-software" and select any option (e.g. "JewelCAD Pro" or "Rhino")
30. [Browser] Fill "16.8" in input with data-testid="input-weight-estimate"
31. [Browser] Click button with data-testid="button-cad-draft" (Save draft)
32. [Verify] Assert CAD record appears in the list for PRD-xxx

## PHASE 4: CAM / Milling
33. [Browser] Navigate to /gold-erp?section=cam
34. [Browser] Click button with data-testid="button-add-cam"
35. [Browser] Click trigger with data-testid="select-cam-order" and select PRD-xxx
36. [Browser] Fill "Test Operator" in input with data-testid="input-cam-operator"
37. [Browser] Click button with data-testid="button-save-cam"
38. [Verify] Assert CAM record appears in the list for PRD-xxx

## PHASE 5: Ghat / Weight Verification
39. [Browser] Navigate to /gold-erp?section=ghat
40. [Verify] Assert "Ghat / Weight Verification" heading is visible
41. [Browser] Click button with data-testid="button-add-ghat"
42. [Verify] Assert dialog "New Ghat / Weight Entry" is visible
43. [Browser] Click trigger with data-testid="select-ghat-order" and select PRD-xxx
44. [Browser] Stage defaults to "Casting" — leave as is (data-testid="select-ghat-stage")
45. [Browser] Clear and fill "17.0" in input with data-testid="input-ghat-issued"
46. [Browser] Clear and fill "16.4" in input with data-testid="input-ghat-received"
47. [Browser] Click button with data-testid="button-save-ghat"
48. [Verify]
    - Assert toast "Ghat entry saved" appears
    - Assert the ghat table row for PRD-xxx shows: Issued=17.0 g, Received=16.4 g, Wastage=0.6 g
    - Wastage is auto-computed as issued minus received = 0.6 g (NOT entered manually)

## PHASE 6: Job Finalize
49. [Browser] Navigate to /gold-erp?section=finalize
50. [Verify] Assert "Job Finalize & Barcode / HUID" heading is visible
51. [Browser] Click button with data-testid="button-add-finalize"
52. [Verify] Assert dialog "Finalize Production Job" is visible
53. [Browser] Click trigger with data-testid="select-finalize-order" and select PRD-xxx
54. [Browser] Clear and fill "16.2" in input with data-testid="input-finalize-weight"
55. [Browser] Click button with data-testid="button-save-finalize" (button text "Finalize")
56. [Verify]
    - Assert toast "Job finalized" appears
    - Assert finalize table row for PRD-xxx shows Final Wt = 16.2 g

## PHASE 7: Karigar Settlement
57. [Browser] Navigate to /gold-erp?section=settlement
58. [Verify] Assert "Karigar Settlement" heading is visible
59. [Browser] Click button with data-testid="button-add-settlement"
60. [Verify] Assert dialog "New Karigar Settlement" is visible
61. [Browser] Click trigger with data-testid="select-settlement-order" and select PRD-xxx
62. [Browser] Click trigger with data-testid="select-settlement-karigar" and select "Raju Goldsmith"
63. [Browser] Clear and fill "17.0" in input with data-testid="input-settlement-issued"
64. [Browser] Clear and fill "16.2" in input with data-testid="input-settlement-received"
65. [Browser] Clear and fill "6480" in input with data-testid="input-settlement-wage"
66. [Browser] Click button with data-testid="button-save-settlement" (text "Record Settlement")
67. [Verify]
    - Assert toast "Settlement recorded" appears
    - Assert settlement table row for PRD-xxx / Raju Goldsmith appears with Wage = ₹6,480
