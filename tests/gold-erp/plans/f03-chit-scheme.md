# F3 — Gold Chit Scheme: Setup → Enroll → Collect → Maturity → Redemption
# Create scheme → enroll Lakshmi Devi → record 3 payments → check defaulters → check maturity → redemption
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads (not /auth)

## PHASE 1: Create Chit Scheme
4. [Browser] Navigate to /gold-erp?section=chit
5. [Verify] Assert "Gold Chit Schemes" heading is visible
6. [Browser] Click button with data-testid="button-add-scheme"
7. [Verify] Assert dialog "New Chit Scheme" is open
8. [Browser] Clear and fill "Gold Savings 11+1" in input with data-testid="input-scheme-name"
9. [Browser] Clear and fill "5000" in input with data-testid="input-scheme-amount"
10. [Browser] Clear and fill "11" in input with data-testid="input-scheme-duration"
11. [Browser] Fill today's date in input with data-testid="input-scheme-start-date"
12. [Browser] Click button with data-testid="button-save-scheme"
13. [Verify]
    - Assert toast "Scheme created" appears
    - Assert a card for "Gold Savings 11+1" scheme appears in the grid
    - Scheme cards have data-testid="card-scheme-{id}"

## PHASE 2: Enroll Member
14. [Browser] Click the "Gold Savings 11+1" scheme card (use text "Gold Savings 11+1" to find it)
15. [Verify] Assert dialog opens showing "{scheme_name} — Members"
16. [Browser] Click button with data-testid="button-enroll-member"
17. [Verify] Assert dialog "Enroll Member" is open
18. [Browser] Fill "Lakshmi Devi" in input with data-testid="input-member-name"
19. [Browser] Fill "9900112233" in input with data-testid="input-member-phone"
20. [Browser] Click button with data-testid="button-save-member"
21. [Verify]
    - Assert toast "Member enrolled" appears
    - Assert "Lakshmi Devi" appears in the members list with "0 installments paid"
22. [Browser] Close the dialog (press Escape or click X)

## PHASE 3: Collection Register — Month 1 Payment
23. [Browser] Navigate to /gold-erp?section=chit-collection-register
24. [Verify] Assert "Collection Register" heading is visible
25. [Browser] Click trigger with data-testid="select-chit-scheme" and select "Gold Savings 11+1"
26. [Verify] Assert Lakshmi Devi's row appears in the member list
27. [Browser] Click button matching data-testid="button-collect-{member_id}" next to Lakshmi Devi
28. [Verify] Assert payment dialog opens
29. [Browser] Fill "5000" in the Amount (₹) field
30. [Browser] Select "Cash" as Payment Mode
31. [Browser] Click button with data-testid="button-save-chit-payment"
32. [Verify] Assert toast "Payment recorded" or "Installment recorded" appears

## PHASE 4: Month 2 Payment
33. [Browser] Click "Record Payment" button again for Lakshmi Devi
34. [Browser] Fill "5000" in Amount, select "UPI" as Payment Mode, click button with data-testid="button-save-chit-payment"
35. [Verify] Assert second payment success toast appears

## PHASE 5: Month 3 Payment
36. [Browser] Click "Record Payment" button again for Lakshmi Devi
37. [Browser] Fill "5000" in Amount, select "Cash" as Payment Mode, click button with data-testid="button-save-chit-payment"
38. [Verify] Assert third payment success toast appears
39. [Browser] Navigate away and back to /gold-erp?section=chit-collection-register, reselect "Gold Savings 11+1"
40. [Verify] Assert Lakshmi Devi shows 3 installments paid OR installments count ≥ 3

## PHASE 6: Defaulters Page (screen load check)
41. [Browser] Navigate to /gold-erp?section=chit-defaulters
42. [Verify] Assert "Chit Defaulters" heading is visible (page loads without error; empty list is OK)

## PHASE 7: Maturity Page
43. [Browser] Navigate to /gold-erp?section=chit-maturity
44. [Verify]
    - Assert "Chit Scheme Maturity" heading is visible
    - Page loads without error
    - Accept if list is empty or shows Lakshmi Devi in upcoming maturity

## PHASE 8: Redemption
45. [Browser] Navigate to /gold-erp?section=chit-redemptions
46. [Verify] Assert "Chit Redemptions" heading is visible
47. [Browser] Click button with data-testid="button-add-redemption" (text "Process Redemption")
48. [Verify] Assert dialog "Process Chit Redemption" is open
49. [Browser] Click trigger with data-testid="select-redemption-member" and select "Lakshmi Devi"
50. [Browser] Click button with data-testid="button-save-redemption" (text "Process")
51. [Verify]
    - Assert toast "Redemption processed" appears
    - Assert a row for Lakshmi Devi appears in the redemptions table
