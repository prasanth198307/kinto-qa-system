# F1 — Complete Production Cycle (DS-NK-001 Necklace)
# Karigar master → design → production order → sketch → CAD (approval gate) → CAM → ghat → finalize → settlement
# PRE-REQ: Run 00-master-data-setup first (Raju Goldsmith and metal rates must exist)
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth
3. [Browser] Fill "gold-erp-demo" in Company ID, "goldadmin" in username, "Gold@1234" in password
4. [Browser] Click Sign In
5. [Verify] Assert dashboard loads (not /auth)

## PHASE 1: Production Order
6. [Browser] Navigate to Production section (path: /gold-erp?section=production)
7. [Verify] Assert "Production Orders" heading is visible
8. [Browser] Click the "+ New Order" or "New Production Order" button
9. [Browser] Fill in "DS-NK-001" or select a design — if a design lookup exists type "necklace" or "DS-NK-001"
10. [Browser] Select "Raju Goldsmith" in the Karigar field
11. [Browser] Select "Gold" in Metal dropdown
12. [Browser] Select "22K (916)" in Purity dropdown
13. [Browser] Fill in "1" in the Quantity field
14. [Browser] Fill in "17.0" in the Gold to Issue (gm) field — 10% over target for wastage buffer
15. [Browser] Set target completion date to today + 7 days
16. [Browser] Click Save
17. [Verify]
    - Assert a production order is created (an order number like PO-2024-0001 is shown)
    - Assert stage badge shows "Sketch" or the first production stage

## PHASE 2: Sketch Stage
18. [Browser] Navigate to Sketch section (path: /gold-erp?section=sketch)
19. [Verify] Assert Sketch screen is visible
20. [Browser] Find the newly created production order and click to select or open it
21. [Browser] Fill in sketch details or notes — enter "Plain Necklace design sketch approved" in any notes/description field
22. [Browser] Click "Mark Complete" or "Advance Stage" button
23. [Verify] Assert sketch stage is marked complete or stage advances to CAD

## PHASE 3: CAD Process
24. [Browser] Navigate to CAD section (path: /gold-erp?section=cad)
25. [Browser] Find the production order and open it
26. [Browser] Fill in "RhinoGold" or similar in the software/tools field if present
27. [Browser] Set Customer Approval status to "Approved" if that field exists
28. [Browser] Click Save / Mark Complete
29. [Verify] Assert CAD stage is marked complete and order advances

## PHASE 4: CAM / Milling
30. [Browser] Navigate to CAM section (path: /gold-erp?section=cam)
31. [Browser] Find the order and advance the CAM stage
32. [Browser] Fill in machine/tool details if required
33. [Browser] Click Mark Complete
34. [Verify] Assert CAM stage complete

## PHASE 5: Ghat Settlement Entry
35. [Browser] Navigate to Ghat Settlement (path: /gold-erp?section=ghat)
36. [Verify] Assert Ghat Settlement screen is visible
37. [Browser] Click "+ Add Ghat Entry" or similar button
38. [Browser] Select the production order (PO-2024-0001)
39. [Browser] Fill in "0.6" in Wastage / Ghat (gm) field
40. [Browser] Fill in any required notes
41. [Browser] Click Save
42. [Verify] Assert ghat entry saved successfully

## PHASE 6: Job Finalize
43. [Browser] Navigate to Job Finalize section (path: /gold-erp?section=finalize)
44. [Verify] Assert Job Finalize screen is visible
45. [Browser] Find the production order and open finalization form
46. [Browser] Fill in "16.2" in Received Weight (gm) field — the actual piece weight
47. [Browser] Fill in "0.6" in Wastage Collected (gm)
48. [Browser] Set status to "Completed"
49. [Browser] Set completed date to today
50. [Browser] Click Save / Finalize
51. [Verify] Assert order is marked as finalized/completed

## PHASE 7: Karigar Settlement
52. [Browser] Navigate to Karigar Settlement (path: /gold-erp?section=settlement)
53. [Verify] Assert Karigar Settlement screen is visible
54. [Browser] Select the production order (PO-2024-0001) in the order lookup field
55. [Verify]
    - Assert Gold Issued shows 17.0 gm (auto-populated)
    - Assert Gold in Piece shows 16.2 gm (auto-populated from finalize)
    - Assert Wastage Collected shows 0.6 gm
56. [Browser] Fill "0.6" in Wastage Collected if not already populated
57. [Verify]
    - Assert Total Accounted = 16.8 gm (16.2 + 0.6)
    - Assert Unaccounted = 0.2 gm (17.0 − 16.8)
    - Assert Allowed Wastage = 0.85 gm (5% × 17.0)
    - Assert Excess Wastage = 0 gm (within limit)
    - Assert Making Charges = ₹6,480 (16.2 × ₹400)
    - Assert Net Payable = ₹6,480
58. [Browser] Click Confirm Settlement or Save
59. [Verify] Assert settlement is saved with net payable ₹6,480

## PHASE 8: View Karigar Ledger
60. [Browser] Navigate to Karigar Ledger (path: /gold-erp?section=karigar-ledger)
61. [Verify] Assert the settlement entry appears in Raju Goldsmith's ledger showing ₹6,480 payable
