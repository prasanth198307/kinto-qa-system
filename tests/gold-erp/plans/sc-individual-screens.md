# SC — Individual Screen Tests: 8 Screens Not Covered by Flows
# Promotions · Credit Limit Block · Line-wise Inventory · Karigar Attendance · Vault Audit · E-Commerce Live Rate · MIS Analytics · Metal P&L
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## SCREEN 1: Promotions & Rewards
4. [Browser] Navigate to Promotions (path: /gold-erp?section=promotions)
5. [Verify] Assert Promotions screen is visible
6. [Browser] Click "+ Create Promotion"
7. [Browser] Fill "Festival Offer — 0% Making Charges" in Name
8. [Browser] Select "Making charge waiver" as promotion type if available
9. [Browser] Fill "100" in Discount Value (100% of making charges)
10. [Browser] Fill "50000" in Minimum Purchase amount (₹50,000 threshold)
11. [Browser] Set valid from today, valid to today + 7
12. [Browser] Click Save
13. [Verify] Assert promotion created with status Active
14. [Verify]
    - Assert promotion shows min purchase ₹50,000
    - Assert promotion dates are correct
    - Assert discount type is making charge waiver

## SCREEN 2: Credit Limit Block Test
15. [Browser] Navigate to B2B Order Booking (path: /gold-erp?section=wholesale-b2b-orders)
16. [Browser] Click "+ New Order" 
17. [Browser] Select or fill "Priya Jewellers" (credit limit ₹5,00,000) in customer field
18. [Browser] Fill "490000" in Order Value
19. [Browser] Click Save
20. [Verify] Assert Order A created for ₹4,90,000 (within credit limit)
21. [Browser] Click "+ New Order" again
22. [Browser] Select "Priya Jewellers" again
23. [Browser] Fill "20000" in Order Value (₹4,90,000 + ₹20,000 = ₹5,10,000 — exceeds limit)
24. [Browser] Click Save
25. [Verify] Assert credit limit error shown — order blocked. Message should mention credit limit exceeded, outstanding amount, and available credit.

## SCREEN 3: Karigar Attendance
26. [Browser] Navigate to Karigar Attendance (path: /gold-erp?section=karigar-attendance)
27. [Verify] Assert Karigar Attendance screen is visible
28. [Browser] Set date to today
29. [Browser] Mark "Raju Goldsmith" as Present (Full Day)
30. [Browser] Mark "Suresh Stone Setter" as Half Day
31. [Browser] Click Save Attendance
32. [Verify]
    - Assert Raju's daily wage = ₹800 (full day × ₹800)
    - Assert Suresh's daily wage = ₹400 (half day × ₹800)
33. [Browser] Mark Raju as Absent for yesterday's date (if editing past dates is allowed)
34. [Verify] Assert absent day shows ₹0 wage

## SCREEN 4: Vault Audit (Bullion Vault)
35. [Browser] Navigate to Vault Audit (path: /gold-erp?section=vault-audit)
36. [Browser] Click "+ Start Vault Audit"
37. [Browser] Fill auditor names (at least 2 if required)
38. [Browser] Fill "Main Vault — Safe #1" in vault location
39. [Browser] Fill "100.0" in Physical count: Gold bar weight
40. [Verify] Assert system shows expected balance (100.0 gm from F5 inward if run previously)
41. [Verify] Assert discrepancy = 0.0 gm when counts match
42. [Browser] Click Close Audit / Submit
43. [Verify] Assert audit closed with zero discrepancy

## SCREEN 5: E-Commerce Live Gold Rate Pricing
44. [Browser] Navigate to E-Commerce Store (path: /gold-erp?section=ecommerce)
45. [Verify] Assert E-Commerce Store management screen is visible
46. [Browser] Note the current price of any listed item (should reflect ₹6,820 22K rate)
47. [Browser] Navigate to Metal Rates (path: /gold-erp?section=rates) in a new tab or same window
48. [Browser] Update 22K gold rate to "7000" and save
49. [Browser] Navigate back to E-Commerce Store (path: /gold-erp?section=ecommerce)
50. [Verify] Assert item prices have updated to reflect the new ₹7,000 rate (dynamic pricing)
51. [Browser] Reset rate back to "6820" and save
52. [Verify] Assert prices revert to ₹6,820 based calculation

## SCREEN 6: JW Analytics Deep Dive
53. [Browser] Navigate to JW Analytics (path: /gold-erp?section=analytics)
54. [Verify]
    - Assert JW Analytics screen is visible with KPI cards
    - Assert "Total Production (gm)" card is present
    - Assert "Wastage (gm)" card is present
    - Assert "Active Karigars" card is present
    - Assert "Making Charges (₹)" card is present
55. [Verify] Assert at least one chart or graph is rendered (production trend or wastage breakdown)

## SCREEN 7: Overview Quick Links
56. [Browser] Navigate to Gold ERP Overview (path: /gold-erp?section=overview)
57. [Verify]
    - Assert 4 quick-link tiles are visible: "JW Analytics", "Sales Dashboard", "MIS Dashboard", "HR & Payroll"
    - Assert clicking "JW Analytics" tile navigates to /gold-erp?section=analytics
58. [Browser] Click the "JW Analytics" quick-link tile
59. [Verify] Assert URL changes to section=analytics and JW Analytics screen loads

## SCREEN 8: Sidebar Navigation Labels Verification
60. [Browser] Navigate to Gold ERP (path: /gold-erp?section=overview)
61. [Verify]
    - Assert sidebar shows "Jewellery Items" (not "Item Master")
    - Assert sidebar shows "Karigar Job Orders (Internal)" (not "Jobwork")
    - Assert sidebar shows "Customer Jobwork (Customer's Gold)" (not "Wholesale Jobwork")
    - Assert sidebar shows "Hallmarking — Batch Submission" (not "Hallmarking Batches")
    - Assert sidebar shows "Hallmarking — HUID Records" (not "Hallmarking Register")
    - Assert sidebar shows "Old Gold Purchase (No Sale)" (not "POS Old Gold")
    - Assert sidebar does NOT show "JW Analytics" as a top-level nav item
    - Assert standard "Point of Sale" (/pos) is NOT visible in the sidebar for gold_erp_plan users
