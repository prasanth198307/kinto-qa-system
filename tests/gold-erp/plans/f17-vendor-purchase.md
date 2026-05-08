# F17 — Vendor Purchase → GRN → Payment → Sales Invoice → Dispatch → Delivery
# New vendor → PO → GRN → payment → sales invoice → dispatch → pending payment tracking
# NOTE: E-way bill external API step is skipped (simulated)
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Create Vendor
4. [Browser] Navigate to Vendors (path: /vendors)
5. [Browser] Click "+ Add Vendor"
6. [Browser] Fill "Shree Gems & Jewels" in Vendor Name
7. [Browser] Fill "36AABCS5432L1Z7" in GSTIN
8. [Browser] Fill "Diamond supplier — Surat" in address/notes
9. [Browser] Fill "500000" in Credit Limit
10. [Browser] Fill "30" in Payment Terms (days)
11. [Browser] Click Save
12. [Verify] Assert vendor "Shree Gems & Jewels" created

## PHASE 2: Create Purchase Order
13. [Browser] Navigate to Purchase Orders (path: /purchase-orders)
14. [Browser] Click "+ New PO"
15. [Browser] Select "Shree Gems & Jewels" as vendor
16. [Browser] Add line item: "2mm Round Diamonds" — qty 50, rate ₹800 per piece
17. [Browser] Fill notes "For 18K diamond rings — urgent"
18. [Browser] Set expected delivery to today + 7 days
19. [Browser] Click Save
20. [Verify]
    - Assert PO created with PO number
    - Assert PO value = ₹40,000 (50 × ₹800)
    - Assert GST @ 0.25% on rough diamonds if applicable

## PHASE 3: Goods Receipt Note (GRN)
21. [Browser] Navigate to GRN (path: /goods-receipt-notes)
22. [Browser] Click "+ New GRN"
23. [Browser] Select the PO from Step 20
24. [Browser] Fill "48" in Received Quantity (2 short of 50)
25. [Browser] Fill "2mm Round Diamonds — 48 pieces received, 2 on backorder" in notes
26. [Browser] Set receipt date to today
27. [Browser] Click Save
28. [Verify]
    - Assert GRN created linked to PO
    - Assert 48 units received, 2 pending
    - Assert stock updated with 48 diamonds

## PHASE 4: Record Payment to Vendor
29. [Browser] Navigate to Expenses or Vendor Payments
30. [Browser] Record payment for the GRN — ₹38,400 (48 × ₹800)
31. [Browser] Select payment mode "Bank Transfer"
32. [Browser] Fill "NEFT Ref: HDFC20241001" in reference
33. [Browser] Click Save
34. [Verify] Assert payment recorded against the vendor

## PHASE 5: Sales Invoice to Customer
35. [Browser] Navigate to Invoices (path: /invoices)
36. [Browser] Click "+ New Invoice"
37. [Browser] Select customer "Priya Jewellers"
38. [Browser] Add line item: "18K Diamond Ring (DS-RG-001)" — qty 2, rate ₹45,000 each
39. [Browser] Apply GST 3% on gold + 5% on making
40. [Browser] Click Save
41. [Verify] Assert invoice created — total approximately ₹95,400

## PHASE 6: Dispatch
42. [Browser] Navigate to Gatepasses or Dispatch (path: /gatepasses)
43. [Browser] Click "+ New Gatepass"
44. [Browser] Link to the sales invoice from Step 41
45. [Browser] Fill dispatch details: courier "Blue Dart", tracking "BD123456789"
46. [Browser] Click Save
47. [Verify] Assert gatepass/dispatch created; invoice status changes to "Dispatched"

## PHASE 7: Delivery Confirmation
48. [Browser] Update gatepass status to "Delivered"
49. [Browser] Set delivery date to today
50. [Verify] Assert delivery confirmed; invoice status shows pending payment from Priya Jewellers
