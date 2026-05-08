# F2 — Retail POS Sale + Old Gold Exchange + Loyalty
# Walk-in → estimate → customer approval → POS billing with old gold exchange + loyalty redemption + split payment
# PRE-REQ: Metal rates set (22K ₹6,820/gm), Loyalty member Meena Reddy with 500 pts
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth
3. [Browser] Fill "gold-erp-demo" / "goldadmin" / "Gold@1234" then click Sign In
4. [Verify] Assert dashboard loads

## PHASE 1: Estimate / Quotation
5. [Browser] Navigate to Estimates (path: /gold-erp?section=estimates)
6. [Verify] Assert Estimates screen is visible
7. [Browser] Click "+ New Estimate" or similar button
8. [Browser] Fill "Meena Reddy" in the Customer Name field
9. [Browser] Select "Gold" as metal
10. [Browser] Select "22K (916)" as purity
11. [Browser] Fill "16.2" in Weight (gm) field
12. [Verify]
    - Assert Today's Rate auto-populates to ₹6,820/gm
    - Assert Gold Value auto-calculates (approximately ₹1,01,622 = 16.2 × 6820 × 0.916)
13. [Browser] Fill "400" in Making Charges (per gram) field
14. [Verify]
    - Assert Making Amount auto-calculates to ₹6,480 (16.2 × 400)
    - Assert GST field shows approximately ₹3,371 (3% on gold + 5% on making)
    - Assert Total Estimate is approximately ₹1,11,473
15. [Browser] Click Save or Create Estimate
16. [Verify] Assert estimate is saved and shows in the list

## PHASE 2: Customer Approval (Items on Approval)
17. [Browser] Navigate to Customer Approvals (path: /gold-erp?section=customer-approvals)
18. [Browser] Click "+ Issue on Approval" button
19. [Browser] Fill "Meena Reddy" or search for her in the Customer field
20. [Browser] Fill or scan item tag "DT-0042" in the Items field (or fill item description "22K Necklace 16.2gm")
21. [Browser] Set Expected Return Date to today + 2 days
22. [Browser] Click Save
23. [Verify]
    - Assert approval record created with customer Meena Reddy
    - Assert item status shows "On Approval"

## PHASE 3: Convert Approval to POS Sale
24. [Browser] Find the approval record for DT-0042 and click "Convert to Sale" button
25. [Verify] Assert Jewellery POS screen opens with item pre-loaded

## PHASE 4: Jewellery POS Billing
26. [Browser] Navigate to Jewellery POS if not already there (path: /gold-erp?section=jewellery-pos)
27. [Browser] Search for customer "Meena Reddy" or "LY-00123" in the customer field
28. [Verify] Assert loyalty points balance shows 500 points for Meena Reddy

## Add Old Gold Exchange
29. [Browser] Click "Add Old Gold Exchange" or similar button/toggle
30. [Verify] Assert old gold exchange section expands
31. [Browser] Fill "22K chain (customer's)" in Item Description
32. [Browser] Fill "10.5" in Gross Weight (gm)
33. [Browser] Select "22K" as purity tested
34. [Browser] Fill "0.5" in Stone Weight Deduction (gm)
35. [Verify]
    - Assert Net Weight auto-calculates to 10.0 gm (10.5 − 0.5)
    - Assert Exchange Value auto-calculates (10.0 × 6820 × 0.95 = approximately ₹64,790)

## Apply Loyalty Redemption
36. [Browser] Check or click "Redeem Loyalty Points" option
37. [Browser] Fill "500" in Points to Redeem field (or accept the pre-filled balance)
38. [Verify] Assert Redemption Value shows the points-to-rupee conversion (e.g. ₹500)

## Payment Split
39. [Browser] Fill payment amounts for split — cash portion and UPI/card portion
40. [Browser] Click "Complete Sale" or "Print Bill" button
41. [Verify]
    - Assert bill is created with GST breakdown
    - Assert old gold exchange value is deducted from total
    - Assert loyalty points redeemed shown on bill
    - Assert success toast "Sale completed" or similar

## PHASE 5: Old Gold Purchase (No Sale) — separate counter test
42. [Browser] Navigate to Old Gold Purchase (path: /gold-erp?section=pos-old-gold)
43. [Verify] Assert "Old Gold Purchase (No Sale)" screen is visible
44. [Browser] Click "+ New Purchase" button
45. [Browser] Fill "Sunita Bai" in Customer Name
46. [Browser] Fill "9988776655" in Phone
47. [Browser] Fill "Old 22K bangles" in Item Description
48. [Browser] Fill "25.0" in Gross Weight (gm)
49. [Browser] Fill "1.5" in Stone Weight (gm)
50. [Browser] Fill "6820" in Today's Rate
51. [Browser] Fill "95" in Buyback Rate %
52. [Browser] Click Save
53. [Verify]
    - Assert purchase record created (Net weight = 23.5 gm, Credit Value = 23.5 × 6820 × 0.95 ≈ ₹1,52,367)
    - Assert record appears in old gold purchase list
54. [API] GET /api/gold-erp/bullion-transactions and verify a recent transaction with txn_type='purchase' and party_name='Sunita Bai' exists — confirming the bullion mirror write worked
