# F3 — Gold Chit Scheme: Setup → Enroll → Collect → Default → Redeem
# Create scheme → enroll Lakshmi Devi → 2 on-time + 1 late payment → defaulter flag → maturity → redemption
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Create Chit Scheme
4. [Browser] Navigate to Chit Schemes (path: /gold-erp?section=chit)
5. [Verify] Assert Chit Schemes screen is visible
6. [Browser] Click "+ New Scheme" or Create Scheme button
7. [Browser] Fill "Gold Savings 11+1" in Scheme Name
8. [Browser] Fill "12" in Duration (months)
9. [Browser] Fill "5000" in Monthly Instalment (₹)
10. [Browser] Set start date to today
11. [Browser] Fill "60000" in Total Scheme Value if required (12 × 5000)
12. [Browser] Click Save
13. [Verify] Assert scheme "Gold Savings 11+1" appears in list with status Active

## PHASE 2: Enroll Member
14. [Browser] Open the scheme or navigate to Collection Register (path: /gold-erp?section=chit-collection-register)
15. [Browser] Click "+ Enroll Member" or Add Member button
16. [Browser] Fill "Lakshmi Devi" in Member Name
17. [Browser] Fill "9900112233" in Mobile
18. [Browser] Select "Gold Savings 11+1" scheme
19. [Browser] Set enrollment date to today
20. [Browser] Click Save
21. [Verify] Assert Lakshmi Devi appears as an enrolled member

## PHASE 3: Record Month-1 Payment (On Time)
22. [Browser] Navigate to Collection Register (path: /gold-erp?section=chit-collection-register)
23. [Browser] Find Lakshmi Devi's record and click "Record Payment" or similar
24. [Browser] Fill "1" in Instalment Number
25. [Browser] Fill "5000" in Amount (INR) / amount_inr field
26. [Browser] Set payment date to today
27. [Browser] Select "Cash" as payment mode
28. [Browser] Click Save
29. [Verify] Assert payment recorded, balance shows ₹5,000 collected (1 of 12)

## PHASE 4: Record Month-2 Payment (On Time)
30. [Browser] Record another payment for Lakshmi Devi
31. [Browser] Fill instalment "2", amount "5000", date today (simulating month 2)
32. [Browser] Click Save
33. [Verify] Assert cumulative collected shows ₹10,000 (2 of 12)

## PHASE 5: Month-3 — Late Payment (Defaulter Test)
34. [Browser] Navigate to Defaulters (path: /gold-erp?section=chit-defaulters)
35. [Verify] Assert Defaulters screen is visible (may show Lakshmi Devi if month-3 is overdue)
36. [Browser] Go back to Collection Register and record month-3 payment with a late date
37. [Browser] Fill instalment "3", amount "5000", mark as "Late" if that field exists
38. [Browser] Click Save
39. [Verify] Assert late payment is recorded and possibly flagged in defaulters list

## PHASE 6: View Defaulter Report
40. [Browser] Navigate to Defaulters (path: /gold-erp?section=chit-defaulters)
41. [Verify] Assert defaulters screen shows and any overdue members are listed

## PHASE 7: Maturity
42. [Browser] Navigate to Maturity (path: /gold-erp?section=chit-maturity)
43. [Verify] Assert Maturity screen is visible
44. [Browser] Look for Lakshmi Devi's scheme entry (may show as future maturity)
45. [Verify] Assert maturity record shows total collected amount and maturity date

## PHASE 8: Redemption
46. [Browser] Navigate to Redemptions (path: /gold-erp?section=chit-redemptions)
47. [Verify] Assert Redemptions screen is visible
48. [Browser] Click "+ New Redemption" or similar
49. [Browser] Select "Lakshmi Devi" as the member
50. [Browser] Select redemption type "Gold Purchase" or "Cash Payout"
51. [Browser] Fill redemption amount "15000" (simulating partial redemption)
52. [Browser] Click Save
53. [Verify] Assert redemption record created for Lakshmi Devi
