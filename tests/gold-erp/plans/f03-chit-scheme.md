# F3 — Gold Chit Scheme: Setup → Enroll → Collect → Default → Redeem
# Create scheme → enroll Lakshmi Devi → Collection Register: 2 on-time + 1 late payment → defaulter flag → maturity → redemption
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
11. [Browser] Click Save
12. [Verify] Assert scheme "Gold Savings 11+1" appears in list with status Active

## PHASE 2: Enroll Member
13. [Browser] Open the scheme "Gold Savings 11+1" by clicking on it
14. [Verify] Assert the Members dialog or section is visible
15. [Browser] Click "+ Enroll Member" or "Add Member" button
16. [Browser] Fill "Lakshmi Devi" in Member Name
17. [Browser] Fill "9900112233" in Mobile/Phone
18. [Browser] Fill "Kondapur, Hyderabad" in Address if present
19. [Browser] Click Save / Enroll
20. [Verify] Assert Lakshmi Devi appears as an enrolled member with 0 installments paid

## PHASE 3: Collection Register — Month 1 Payment
21. [Browser] Navigate to Collection Register (path: /gold-erp?section=chit-collection-register)
22. [Browser] Select "Gold Savings 11+1" in the scheme dropdown
23. [Verify]
    - Assert Lakshmi Devi appears as a member row in the collection register
    - Assert a "Record Payment" button is visible next to her name
24. [Browser] Click "Record Payment" button next to Lakshmi Devi
25. [Verify] Assert the payment dialog opens showing her name and instalment number
26. [Browser] Fill "5000" in the Amount (₹) field
27. [Browser] Select "Cash" as Payment Mode
28. [Browser] Ensure Paid Date is today
29. [Browser] Click "Record Payment" to save
30. [Verify] Assert payment recorded — success toast "Payment recorded" appears
31. [Browser] Navigate away and back to collection register, reselect "Gold Savings 11+1"
32. [Verify] Assert Lakshmi Devi now shows "1 installments paid · ₹5,000"

## PHASE 4: Month 2 Payment
33. [Browser] Click "Record Payment" again for Lakshmi Devi
34. [Browser] Fill "5000" in Amount, select "UPI" as mode
35. [Browser] Click Record Payment
36. [Verify] Assert Lakshmi Devi shows "2 installments paid · ₹10,000"

## PHASE 5: Month 3 — Late (via Defaulters page)
37. [Browser] Navigate to Defaulters (path: /gold-erp?section=chit-defaulters)
38. [Verify] Assert Chit Defaulters screen is visible (may be empty or show overdue members)
39. [Browser] Navigate back to Collection Register and record Month 3 payment for Lakshmi Devi
40. [Browser] Fill "5000" in Amount, "Cash" as mode, click Record Payment
41. [Verify] Assert 3 installments paid · ₹15,000 shown for Lakshmi Devi

## PHASE 6: Maturity
42. [Browser] Navigate to Maturity (path: /gold-erp?section=chit-maturity)
43. [Verify] Assert Maturity screen is visible
44. [Verify] Assert it shows the Gold Savings 11+1 scheme with maturity date and total amount

## PHASE 7: Redemption
45. [Browser] Navigate to Redemptions (path: /gold-erp?section=chit-redemptions)
46. [Verify] Assert Redemptions screen is visible
47. [Browser] Click "+ New Redemption" or Add Redemption button
48. [Browser] Select "Lakshmi Devi" or search for her member record
49. [Browser] Fill "15000" as redemption amount
50. [Browser] Select redemption type (Gold Purchase / Cash Payout if available)
51. [Browser] Click Save
52. [Verify] Assert redemption record created for Lakshmi Devi — ₹15,000
