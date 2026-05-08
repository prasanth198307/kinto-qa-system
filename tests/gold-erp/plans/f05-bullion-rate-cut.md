# F5 — Bullion Booking → Rate Cut Invoice → Vault Entry → Vault Audit
# Bullion booking → inward → rate cut invoice (2 deductions) → vault entry → vault audit
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Bullion Booking
4. [Browser] Navigate to Bullion Bookings (path: /gold-erp?section=bullion-bookings)
5. [Verify] Assert Bullion Bookings screen is visible
6. [Browser] Click "+ New Booking" button
7. [Browser] Select "Supplier" as party type
8. [Browser] Fill "Riddhi Siddhi Bullion" in Party Name
9. [Browser] Select "Gold" as metal type
10. [Browser] Select "Bar" as form type
11. [Browser] Fill "99.5" in Fineness (purity %)
12. [Browser] Fill "100.0" in Weight (gm)
13. [Browser] Fill "7200" in Rate per gram
14. [Browser] Set expected delivery to today + 2 days
15. [Browser] Select "Advance" in Payment Terms
16. [Browser] Click Save
17. [Verify]
    - Assert booking created with reference number BBK-001 or similar
    - Assert Amount = ₹7,20,000 (100 × 7200)
    - Assert GST 3% = ₹21,600
    - Assert Total = ₹7,41,600

## PHASE 2: Bullion Inward (Stock Receipt)
18. [Browser] Navigate to Bullion Stock (path: /gold-erp?section=bullion)
19. [Browser] Click "+ Record Inward" or "New Transaction" button
20. [Browser] Select "Purchase" as transaction type
21. [Browser] Fill "Riddhi Siddhi Bullion" in Party Name
22. [Browser] Select "Gold" as metal type
23. [Browser] Fill "99.5% purity" in Purity Name
24. [Browser] Fill "100.0" in Weight (gm)
25. [Browser] Fill "7200" in Rate per gram
26. [Browser] Set date to today
27. [Browser] Click Save
28. [Verify]
    - Assert bullion transaction recorded with 100 gm inward
    - Assert running bullion stock increases by 100 gm

## PHASE 3: Rate Cut Invoice
29. [Browser] Navigate to Rate Cut Invoices (path: /gold-erp?section=bullion-rate-cuts)
30. [Verify] Assert Rate Cut Invoices screen is visible
31. [Browser] Click "+ New Rate Cut Invoice"
32. [Browser] Select the bullion inward transaction or fill "Riddhi Siddhi Bullion" in supplier
33. [Browser] Fill "100.0" in Gold Weight (gm)
34. [Browser] Fill "7200" in Agreed Rate
35. [Browser] Add first rate cut: Fill "0.5" in Rate Cut 1 (gm/loss deduction)
36. [Browser] Add second rate cut: Fill "0.2" in Rate Cut 2
37. [Browser] Fill any settlement notes
38. [Browser] Click Save
39. [Verify]
    - Assert net weight after cuts = 99.3 gm (100 − 0.5 − 0.2)
    - Assert final settlement value calculated correctly
    - Assert invoice created for supplier

## PHASE 4: Vault Movement
40. [Browser] Navigate to Vault Movement (path: /gold-erp?section=vault-movement)
41. [Verify] Assert Vault Movement screen is visible
42. [Browser] Click "+ Record Movement"
43. [Browser] Select "Inward" as movement type
44. [Browser] Fill "Main Vault — Safe #1" in Vault Location
45. [Browser] Fill "100.0" in Weight (gm)
46. [Browser] Select "Gold" as metal
47. [Browser] Set date to today
48. [Browser] Click Save
49. [Verify] Assert vault movement recorded: 100 gm inward to Main Vault

## PHASE 5: Vault Audit
50. [Browser] Navigate to Vault Audit (path: /gold-erp?section=vault-audit)
51. [Verify] Assert Vault Audit screen is visible
52. [Browser] Click "+ Start Vault Audit" button
53. [Browser] Fill "Main Vault — Safe #1" in Vault Location
54. [Browser] Fill "Raju Goldsmith" in Auditors field (at least 2 auditors if required)
55. [Browser] Fill "100.0" in Physical Count: Gold bar weight (gm)
56. [Verify]
    - Assert System value shows 100.0 gm
    - Assert Discrepancy = 0.0 gm (perfect match)
57. [Browser] Click "Close Audit" or "Submit Audit"
58. [Verify] Assert audit closed successfully with zero discrepancy noted
