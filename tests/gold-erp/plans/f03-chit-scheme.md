# F3 — Gold Chit Scheme: Setup → Enroll → Collect → Maturity → Redemption
# Create scheme → enroll Lakshmi Devi → Collection Register: record 3 payments → check defaulters → check maturity → redemption
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Create Chit Scheme
4. [Browser] Navigate to Chit Schemes (/gold-erp?section=chit)
5. [Verify] Assert Chit Schemes screen is visible
6. [Browser] Click "+ New Scheme" button
7. [Browser] Fill "Gold Savings 11+1" in Scheme Name (the 'name' field)
8. [Browser] Fill "12" in Duration (months) — this sets duration_months
9. [Browser] Fill "5000" in Monthly Instalment (₹)
10. [Browser] Set start date to today
11. [Browser] Click Save
12. [Verify] Assert scheme "Gold Savings 11+1" appears in list with status Active

## PHASE 2: Enroll Member
13. [Browser] Click on the "Gold Savings 11+1" scheme row to open its Members dialog
14. [Verify] Assert the Members dialog opens
15. [Browser] Click "+ Enroll Member" button
16. [Browser] Fill "Lakshmi Devi" in Member Name
17. [Browser] Fill "9900112233" in Phone/Mobile
18. [Browser] Click Save / Enroll
19. [Verify] Assert Lakshmi Devi appears as an enrolled member with 0 installments paid
20. [Browser] Close the dialog (click Cancel or X)

## PHASE 3: Collection Register — Month 1 Payment
21. [Browser] Navigate to Collection Register (/gold-erp?section=chit-collection-register)
22. [Browser] Click the scheme dropdown (data-testid="select-chit-scheme") and select "Gold Savings 11+1"
23. [Verify]
    - Assert Lakshmi Devi's member row appears
    - Assert "Record Payment" button is visible next to her name (data-testid="button-collect-{member_id}")
24. [Browser] Click "Record Payment" button next to Lakshmi Devi
25. [Verify] Assert the payment dialog opens showing her name and instalment number
26. [Browser] Fill "5000" in the Amount (₹) field
27. [Browser] Select "Cash" as Payment Mode
28. [Browser] Ensure Paid Date is today
29. [Browser] Click "Record Payment" button (data-testid="button-save-chit-payment")
30. [Verify] Assert success toast "Payment recorded" appears

## PHASE 4: Month 2 Payment
31. [Browser] Click "Record Payment" again for Lakshmi Devi
32. [Browser] Fill "5000" in Amount, select "UPI" as mode, click Record Payment
33. [Verify] Assert second payment toast "Payment recorded" appears

## PHASE 5: Month 3 Payment
34. [Browser] Click "Record Payment" again for Lakshmi Devi
35. [Browser] Fill "5000" in Amount, select "Cash" as mode, click Record Payment
36. [Verify] Assert third payment toast "Payment recorded" appears
37. [Browser] Navigate away and back to collection register, reselect "Gold Savings 11+1"
38. [Verify] Assert Lakshmi Devi shows "3 installments paid" or installment count >= 3

## PHASE 6: Defaulters Page (screen load check)
39. [Browser] Navigate to Defaulters (/gold-erp?section=chit-defaulters)
40. [Verify] Assert "Chit Defaulters" or similar heading is visible (screen loads without error, may be empty list)

## PHASE 7: Maturity Page
41. [Browser] Navigate to Maturity (/gold-erp?section=chit-maturity)
42. [Verify]
    - Assert "Chit Scheme Maturity" heading is visible
    - Assert page loads without error (may show upcoming maturity entries if maturity_date was set on enrollment)
    - Accept if the list is empty — the scheme is newly created, maturity is far in the future

## PHASE 8: Redemption
43. [Browser] Navigate to Redemptions (/gold-erp?section=chit-redemptions)
44. [Verify] Assert Redemptions screen is visible and loads without error
45. [Browser] Click "+ New Redemption" or equivalent button
46. [Browser] Fill in redemption details (member name or scheme, amount 5000, date today)
47. [Browser] Click Save
48. [Verify] Assert redemption record created — success toast or record appears in list
