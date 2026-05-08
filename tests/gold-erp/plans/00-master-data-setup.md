# MASTER DATA SETUP — Run before any flow
# Sets up: metal rates, 2 karigars, 2 designs, customers, chit scheme, vendor
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to the auth page (path: /auth)
3. [Browser] Fill in "gold-erp-demo" in the Company ID field
4. [Browser] Fill in "goldadmin" in the username field
5. [Browser] Fill in "Gold@1234" in the password field
6. [Browser] Click the "Sign In" button
7. [Verify] Assert the page redirects away from /auth and the main navigation is visible

## STEP A: Set Metal Rates
8. [Browser] Navigate to Gold ERP metal rates (path: /gold-erp?section=rates)
9. [Browser] Click the "+ Add Rate" or "Add" button to open the rate form
10. [Browser] Select "Gold" in the Metal dropdown
11. [Browser] Select "22K (916)" in the Purity dropdown
12. [Browser] Fill in "6820" in the Rate per gram field
13. [Browser] Select "IBJA" as source if available
14. [Browser] Set today's date in the Date field
15. [Browser] Click Save
16. [Verify] Assert a success toast appears and a rate row shows "22K (916) — ₹6,820/g"

17. [Browser] Click Add Rate again
18. [Browser] Select "Gold" metal, "18K (750)" purity, enter "5640" as rate
19. [Browser] Click Save
20. [Verify] Assert rate row for 18K shows ₹5,640/g

21. [Browser] Click Add Rate again
22. [Browser] Select "Gold" metal, "24K (999)" purity, enter "7439" as rate
23. [Browser] Click Save

24. [Browser] Click Add Rate again
25. [Browser] Select "Silver" metal, "999" purity, enter "85" as rate
26. [Browser] Click Save
27. [Verify] Assert 4 rate rows are visible in the rates table

## STEP B: Add Karigar 1 — Raju Goldsmith
28. [Browser] Navigate to Karigar section (path: /gold-erp?section=karigar)
29. [Browser] Click the "+ Add Karigar" button
30. [Browser] Fill in "Raju Goldsmith" in the Name field
31. [Browser] Fill in "9876543210" in the Phone/Mobile field
32. [Browser] Fill in "2345 6789 0123" in the Aadhaar field
33. [Browser] Fill in "400" in the Making Charge Rate (per gram) field
34. [Browser] Fill in "5" in the Allowed Wastage % field
35. [Browser] Fill in "800" in the Daily Wage field if present
36. [Browser] Click Save
37. [Verify] Assert "Raju Goldsmith" appears in the karigar list with status Active

## STEP C: Add Karigar 2 — Suresh Stone Setter
38. [Browser] Click "+ Add Karigar" again
39. [Browser] Fill in "Suresh Stone Setter" in the Name field
40. [Browser] Fill in "9876543211" in the Mobile field
41. [Browser] Fill in "500" in the Making Charge Rate field
42. [Browser] Fill in "3" in the Allowed Wastage % field
43. [Browser] Fill in "800" in the Daily Wage field if present
44. [Browser] Click Save
45. [Verify] Assert "Suresh Stone Setter" appears in the list

## STEP D: Verify Metal Rates on Overview
46. [Browser] Navigate to Gold ERP overview (path: /gold-erp?section=overview)
47. [Verify]
    - Assert the stat card "Gold Rate (22K)" shows ₹6,820/g
    - Assert stat card "Karigars" shows at least 2
    - Assert the quick-link tiles for JW Analytics, Sales Dashboard, MIS Dashboard, and HR & Payroll are visible

## STEP E: Record completion
48. [Verify] Assert all master data is set up — metal rates (4 entries), karigars (2 entries) visible
