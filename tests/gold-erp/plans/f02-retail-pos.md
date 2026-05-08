# F2 — Retail POS Sale + Old Gold Exchange
# Estimate (percent making charge) → Jewellery POS → Old Gold Purchase
# PRE-REQ: Metal rates set (22K ₹6,820/gm)
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth
3. [Browser] Fill "gold-erp-demo" in Company ID, "goldadmin" in username, "Gold@1234" in password, click Sign In
4. [Verify] Assert dashboard loads (URL is not /auth)

## PHASE 1: Estimate / Quotation
5. [Browser] Navigate to Estimates (/gold-erp?section=estimates)
6. [Verify] Assert "Estimates / Quotations" heading is visible
7. [Browser] Click "+ New Estimate" button (data-testid="button-add-estimate")
8. [Browser] Fill "Meena Reddy" in Customer Name, "9876543210" in Phone
9. [Browser] Select "gold" in the Metal dropdown
10. [Browser] Select "22K (916)" in the Purity dropdown
11. [Verify] Assert the Rate/g field shows approximately 6820 (auto-filled by useEffect)
12. [Browser] Fill "16.2" in Weight (g) field
13. [Browser] Leave Making Charge Type as the default "%" option
14. [Browser] Fill "2" in Making Charge Value (2% making charge)
15. [Browser] Leave GST as 3
16. [Browser] Click "Calculate Total" (data-testid="button-calculate")
17. [Verify]
    - Assert Metal Value shows approximately ₹1,10,484 (16.2 × 6820)
    - Assert Total shows a positive value greater than ₹1,10,000
18. [Browser] Click "Save Estimate" (data-testid="button-save-estimate")
19. [Verify] Assert estimate row appears in the Estimates list

## PHASE 2: Jewellery POS Billing
20. [Browser] Navigate to Jewellery POS (/gold-erp?section=jewellery-pos)
21. [Verify] Assert Jewellery POS screen is visible
22. [Browser] Click "+ New Bill" button (data-testid="button-new-pos-bill")
23. [Verify] Assert new bill form appears with "New Jewellery POS Bill" heading
24. [Browser] Fill "Meena Reddy" in the Customer input (data-testid="input-pos-customer")
25. [Browser] Fill "9876543210" in the Phone field
26. [Browser] Click "+ Add Item" button (data-testid="button-pos-add-item")
27. [Browser] Fill "22K Necklace" in the Description field of the item row
28. [Browser] Fill "16.2" in Gross Wt (g) field
29. [Browser] Fill "16.2" in Net Wt (g) field
30. [Browser] Fill "6480" in Making (₹) field
31. [Browser] Fill "110000" in Cash (₹) field under Payment Received
32. [Browser] Click "Generate Bill" button (data-testid="button-pos-bill")
33. [Verify]
    - Assert bill saved — mode switches back to list view OR success toast appears
    - Assert a bill row appears in the list for Meena Reddy

## PHASE 3: Customer Approvals
34. [Browser] Navigate to Customer Approvals (/gold-erp?section=customer-approvals)
35. [Verify] Assert Customer Approvals screen loads without error
36. [Browser] Click the "+ Issue on Approval" or "New Approval" button if visible
37. [Browser] Fill "Priya Sharma" in Customer field, "22K Ring 8.0g" in Item field, set return date to any future date
38. [Browser] Click Save
39. [Verify] Assert approval record created or list shows an entry

## PHASE 4: Old Gold Purchase
40. [Browser] Navigate to Old Gold Purchase (/gold-erp?section=pos-old-gold)
41. [Verify] Assert "Old Gold" or "Old Gold Purchase" screen is visible
42. [Browser] Click "+ New Purchase" button
43. [Browser] Fill "Sunita Bai" in Customer Name
44. [Browser] Fill "9988776655" in Phone
45. [Browser] Fill "Old 22K bangles" in Item Description
46. [Browser] Fill "25.0" in Gross Weight (gm)
47. [Browser] Fill "1.5" in Stone Weight (gm)
48. [Browser] Fill "6820" in Today's Rate (₹/gm)
49. [Browser] Fill "95" in Buyback Rate %
50. [Browser] Click Save
51. [Verify] Assert purchase record appears in the list
52. [API] GET /api/gold-erp/bullion-transactions — verify a recent entry with party_name containing "Sunita" or txn_type='purchase' exists
