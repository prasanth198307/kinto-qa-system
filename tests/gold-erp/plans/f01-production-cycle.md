# F1 — Complete Production Cycle (DS-NK-001 Necklace)
# Production Order (planning) → Sketch record (manual link) → CAD → CAM → Ghat → Finalize → Settlement
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
9. [Browser] Select "Raju Goldsmith" in the Karigar dropdown
10. [Browser] Select "Gold" in Metal dropdown
11. [Browser] Select "22K (916)" in Purity dropdown
12. [Browser] Fill in "1" in the Quantity field
13. [Browser] Fill in "17.0" in the Gold to Issue (gm) field
14. [Browser] Set target completion date to any future date
15. [Browser] Click Save
16. [Verify]
    - Assert a production order row is created in the list (order number like PRD-xxx or similar)
    - Assert the stage/status badge shows "planning" (this is the correct initial stage)
    - Note the order number for use in later phases

## PHASE 2: Sketch Stage — Create a Sketch Record
17. [Browser] Navigate to Sketch section (path: /gold-erp?section=sketch)
18. [Verify] Assert "Sketch Process" heading is visible
19. [Browser] Click "+ Add Sketch" button
20. [Browser] In the "Production Order" dropdown, select the order created in Phase 1 (PRD-xxx)
21. [Browser] Fill "Plain necklace — customer approved design" in Customer Brief field
22. [Browser] Fill "https://example.com/sketch.jpg" in Sketch Image URL field
23. [Browser] Fill "Necklace" in Design Category field
24. [Browser] Click Save
25. [Verify]
    - Assert a sketch record appears in the table linked to the production order
    - Assert status shows "pending" or "in_progress"
26. [Browser] Click the Edit (pencil) icon on the sketch record
27. [Browser] Change Status to "approved"
28. [Browser] Check the "Customer Approved" checkbox
29. [Browser] Click Save
30. [Verify] Assert sketch record shows "approved" status and a green checkmark for Customer Approved

## PHASE 3: CAD Process
31. [Browser] Navigate to CAD section (path: /gold-erp?section=cad)
32. [Verify] Assert CAD Process screen is visible
33. [Browser] Click "+ Add CAD" or similar button
34. [Browser] Select the production order (PRD-xxx) in the order dropdown
35. [Browser] Fill "RhinoGold 7" in Software/Tool field if present
36. [Browser] Fill "3D model completed" in any notes/description field
37. [Browser] Click Save
38. [Verify] Assert CAD record is saved and appears in the list

## PHASE 4: CAM / Milling
39. [Browser] Navigate to CAM section (path: /gold-erp?section=cam)
40. [Verify] Assert CAM Process screen is visible
41. [Browser] Click "+ Add CAM" or similar button
42. [Browser] Select the production order (PRD-xxx)
43. [Browser] Fill "Roland DGA milling machine" in Machine field if present
44. [Browser] Click Save
45. [Verify] Assert CAM record saved

## PHASE 5: Ghat Settlement Entry
46. [Browser] Navigate to Ghat Settlement (path: /gold-erp?section=ghat)
47. [Verify] Assert Ghat Settlement screen is visible
48. [Browser] Click "+ Add Ghat Entry" or similar button
49. [Browser] Select the production order (PRD-xxx)
50. [Browser] Fill "0.6" in Wastage / Ghat (gm) field
51. [Browser] Click Save
52. [Verify] Assert ghat entry saved: 0.6 gm wastage for PRD-xxx

## PHASE 6: Job Finalize
53. [Browser] Navigate to Job Finalize section (path: /gold-erp?section=finalize)
54. [Verify] Assert Job Finalize screen is visible
55. [Browser] Click "+ Add Record" or open finalization form
56. [Browser] Select the production order (PRD-xxx)
57. [Browser] Fill "16.2" in Received Weight / Gold in Piece (gm)
58. [Browser] Fill "0.6" in Wastage Collected (gm)
59. [Browser] Set completion date to today
60. [Browser] Click Save
61. [Verify] Assert finalize record saved: received 16.2 gm, wastage 0.6 gm

## PHASE 7: Karigar Settlement
62. [Browser] Navigate to Karigar Settlement (path: /gold-erp?section=settlement)
63. [Verify] Assert Karigar Settlement screen is visible
64. [Browser] Click "+ New Settlement" or find the settlement form
65. [Browser] Select the production order (PRD-xxx) in the order lookup
66. [Browser] Fill "17.0" in Gold Issued (gm) if not auto-populated
67. [Browser] Fill "16.2" in Gold in Piece / Received (gm) if not auto-populated
68. [Browser] Fill "0.6" in Wastage Collected (gm) if not auto-populated
69. [Verify]
    - Assert Making Charges = ₹6,480 (16.2 × ₹400/gm) or verify the calculation
    - Assert Net Payable shows a positive value around ₹6,480
70. [Browser] Click Confirm Settlement or Save
71. [Verify] Assert settlement saved successfully with positive net payable
