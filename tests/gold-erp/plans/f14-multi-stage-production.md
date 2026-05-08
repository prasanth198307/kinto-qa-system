# F14 — Multi-Stage Production: 18K Diamond Ring — All 12 Production Stages
# Casting → Filing → Stone Setting → Polish → QC Fail → Rework → QC Pass → Finalize → Settlement
# PRE-REQ: Karigar Raju Goldsmith and Suresh Stone Setter exist, metal rates set
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## SETUP: Create 18K Diamond Ring Production Order
4. [Browser] Navigate to Production (path: /gold-erp?section=production)
5. [Browser] Click "+ New Order"
6. [Browser] Fill "DS-RG-001" or "18K Diamond Ring" in Design field
7. [Browser] Select "Gold" in Metal, "18K (750)" in Purity
8. [Browser] Fill "1" in Quantity
9. [Browser] Fill "5.0" in Gold to Issue (gm) — slightly over target 4.2 gm for wastage buffer
10. [Browser] Select "Raju Goldsmith" as primary karigar
11. [Browser] Set target date to today + 5 days
12. [Browser] Click Save
13. [Verify] Assert production order created (e.g. PO-RING-001), stage = first stage

## STAGE 1: Sketch / Design
14. [Browser] Navigate to Sketch (path: /gold-erp?section=sketch)
15. [Browser] Find PO-RING-001 and open it
16. [Browser] Fill "Ring sketch approved by designer" in notes
17. [Browser] Mark stage complete or advance
18. [Verify] Assert sketch stage complete

## STAGE 2: CAD Process
19. [Browser] Navigate to CAD (path: /gold-erp?section=cad)
20. [Browser] Open PO-RING-001
21. [Browser] Fill "Matrix / RhinoGold 7" in software field if present
22. [Browser] Set customer approval status to "Approved"
23. [Browser] Mark complete
24. [Verify] Assert CAD stage complete with approval noted

## STAGE 3: CAM / Milling
25. [Browser] Navigate to CAM (path: /gold-erp?section=cam)
26. [Browser] Open PO-RING-001 and advance CAM stage
27. [Browser] Mark complete
28. [Verify] Assert CAM stage complete

## STAGE 4: Ghat Settlement Entry (casting wastage)
29. [Browser] Navigate to Ghat Settlement (path: /gold-erp?section=ghat)
30. [Browser] Click "+ Add Ghat Entry"
31. [Browser] Select PO-RING-001
32. [Browser] Fill "0.3" in Ghat/Wastage (gm) from casting
33. [Browser] Click Save
34. [Verify] Assert ghat entry saved: 0.3 gm casting wastage

## STAGE 5: Filing & Finishing
35. [Browser] If a Filing stage screen exists, navigate to it and mark complete
36. [Verify] Assert filing stage recorded

## STAGE 6: Stone Setting (assign to Suresh)
37. [Browser] Navigate to Production, find PO-RING-001
38. [Browser] Update or add a sub-task for stone setting
39. [Browser] Assign "Suresh Stone Setter" for the stone setting stage
40. [Browser] Fill "3 rounds 2mm diamonds" in stone details if available
41. [Browser] Mark stone setting complete
42. [Verify] Assert stone setting stage complete for Suresh Stone Setter

## STAGE 7: Polish
43. [Browser] Advance order to Polish stage if applicable
44. [Browser] Mark polish complete
45. [Verify] Assert polish complete

## STAGE 8: QC Check — FAIL first
46. [Browser] Navigate to Production, find PO-RING-001
47. [Browser] Update QC status to "Failed" with reason "Stone slightly loose in prong setting"
48. [Browser] Click Save
49. [Verify] Assert QC Failed status shown, rework required

## STAGE 9: Rework
50. [Browser] Update stage to "Rework" or send back to stone setter
51. [Browser] Fill "Re-prong: tighten stone setting" in rework notes
52. [Browser] Mark rework complete
53. [Verify] Assert rework stage complete

## STAGE 10: QC Check — PASS
54. [Browser] Update QC status to "Passed"
55. [Browser] Fill "Stone secure, finish excellent" in QC notes
56. [Browser] Click Save
57. [Verify] Assert QC Passed shown with green status

## STAGE 11: Job Finalize
58. [Browser] Navigate to Job Finalize (path: /gold-erp?section=finalize)
59. [Browser] Open PO-RING-001
60. [Browser] Fill "4.2" in Received Weight (gm) — target piece weight
61. [Browser] Fill "0.5" in Wastage Collected (gm)
62. [Browser] Set completed date to today, status Completed
63. [Browser] Click Save
64. [Verify] Assert job finalized: piece 4.2 gm, wastage 0.5 gm

## STAGE 12: Karigar Settlement
65. [Browser] Navigate to Karigar Settlement (path: /gold-erp?section=settlement)
66. [Browser] Select PO-RING-001
67. [Verify]
    - Assert Gold Issued = 5.0 gm
    - Assert Gold in Piece = 4.2 gm
    - Assert Wastage Collected = 0.5 gm
    - Assert Total Accounted = 4.7 gm
    - Assert Unaccounted = 0.3 gm
    - Assert Allowed Wastage (5%) = 0.25 gm
    - Assert Total Wastage = 0.8 gm
    - Assert Excess Wastage = 0.55 gm (above allowance)
    - Assert RED warning shown for excess wastage
    - Assert Excess Deduction = 0.55 × ₹5,640 (18K rate) shown
    - Assert Making Charges = 4.2 × ₹400 = ₹1,680
    - Assert Net Payable = Making − Deduction
68. [Browser] Confirm settlement
69. [Verify] Assert settlement saved with excess deduction applied
