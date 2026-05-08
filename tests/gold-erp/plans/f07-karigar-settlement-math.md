# F7 — Karigar Settlement Math Verification (Happy Path + Negative Excess Wastage)
# Verify: gold issued = piece + wastage. Test within-allowance (happy) and excess-wastage (negative) cases.
# PRE-REQ: Production order exists with Raju Goldsmith (from F1), or create a fresh one here
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## SETUP: Create test production order for settlement math
4. [Browser] Navigate to Production (path: /gold-erp?section=production)
5. [Browser] Click "+ New Order"
6. [Browser] Select Karigar "Raju Goldsmith", Metal "Gold", Purity "22K (916)"
7. [Browser] Fill "17.0" in Gold to Issue (gm), Qty "1"
8. [Browser] Click Save
9. [Verify] Assert production order created (note the order number)

## HAPPY PATH: Within-Allowance Settlement
10. [Browser] Navigate to Karigar Settlement (path: /gold-erp?section=settlement)
11. [Verify] Assert Karigar Settlement screen is visible
12. [Browser] Select the production order from Step 8 in the order lookup
13. [Verify] Assert Gold Issued auto-populates to 17.0 gm
14. [Browser] Fill "16.2" in Gold in Piece / Received Weight (gm)
15. [Browser] Fill "0.6" in Wastage Collected (gm)
16. [Verify]
    - Assert Total Accounted = 16.8 gm (16.2 + 0.6)
    - Assert Unaccounted = 0.2 gm (17.0 − 16.8)
    - Assert Allowed Wastage = 0.85 gm (5% of 17.0)
    - Assert Total Wastage = 0.8 gm (0.6 + 0.2)
    - Assert Excess Wastage = 0.0 gm (0.8 < 0.85 — within limit)
    - Assert Excess Deduction = ₹0
    - Assert Making Charges = ₹6,480 (16.2 × ₹400/gm)
    - Assert Net Payable = ₹6,480
17. [Verify] Assert NO red warning or excess wastage alert is shown
18. [Browser] Click Confirm Settlement
19. [Verify] Assert settlement saved with Net Payable ₹6,480

## NEGATIVE CASE: Excess Wastage (karigar loses gold)
20. [Browser] Navigate to Production, create another test order with same params (17.0 gm to Raju)
21. [Browser] Click "+ New Order", same karigar/metal/purity/weight, Save
22. [Browser] Navigate to Karigar Settlement again (path: /gold-erp?section=settlement)
23. [Browser] Select the new test order
24. [Browser] Fill "13.5" in Gold in Piece (gm) — significantly less than issued
25. [Browser] Fill "2.0" in Wastage Collected (gm) — more than allowance
26. [Verify]
    - Assert Total Accounted = 15.5 gm (13.5 + 2.0)
    - Assert Unaccounted = 1.5 gm (17.0 − 15.5)
    - Assert Total Wastage = 3.5 gm (2.0 + 1.5)
    - Assert Allowed Wastage = 0.85 gm (5% of 17.0)
    - Assert Excess Wastage = 2.65 gm (3.5 − 0.85)
    - Assert a RED WARNING or alert is shown: "Excess wastage detected"
    - Assert Excess Deduction = approximately ₹18,073 (2.65 × ₹6,820 rate)
    - Assert Making Charges = ₹5,400 (13.5 × ₹400)
    - Assert Net Payable is NEGATIVE (Making ₹5,400 − Deduction ₹18,073 = deficit)
27. [Verify] Assert the UI clearly shows karigar OWES money (negative payable displayed with warning)
28. [Browser] Click Confirm Settlement with negative amount
29. [Verify] Assert settlement recorded noting excess wastage deduction applied
