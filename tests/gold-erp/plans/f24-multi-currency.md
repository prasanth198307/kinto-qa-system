# F24 — Multi-Currency Invoice: AED Export Sale to Dubai Customer
# Setup AED currency → create export invoice in AED → GST export (zero-rated) → payment in AED → exchange reconciliation
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Setup AED Currency & Exchange Rate
4. [Browser] Navigate to Currency Management (path: /currency-management)
5. [Verify] Assert Currency Management screen is visible
6. [Browser] Click "+ Add Currency" or check if AED already exists
7. [Browser] Fill "AED" in Currency Code
8. [Browser] Fill "UAE Dirham" in Currency Name
9. [Browser] Fill "22.50" in Exchange Rate (1 AED = ₹22.50)
10. [Browser] Set effective date to today
11. [Browser] Click Save
12. [Verify] Assert AED currency added with rate ₹22.50

## PHASE 2: Create Export Customer
13. [Browser] Navigate to Customers (path: /customers)
14. [Browser] Click "+ Add Customer"
15. [Browser] Fill "Al Futtaim Jewellery LLC" in Name
16. [Browser] Fill "Dubai, UAE" in Address
17. [Browser] Select "AED" as default currency if that option exists
18. [Browser] Fill "UAE_FUTTAIM_001" in customer code / GSTIN area (enter "Export — no GSTIN" for foreign customer)
19. [Browser] Click Save
20. [Verify] Assert customer "Al Futtaim Jewellery LLC" created

## PHASE 3: Create Multi-Currency Export Invoice
21. [Browser] Navigate to Invoices (path: /invoices)
22. [Browser] Click "+ New Invoice"
23. [Browser] Select "Al Futtaim Jewellery LLC" as customer
24. [Browser] Select "AED" as invoice currency
25. [Browser] Verify exchange rate auto-populates to 22.50 (or fill manually)
26. [Browser] Add line item: "22K Gold Necklace (16.2gm)" — qty 3
27. [Browser] Fill rate in AED: "4,940 AED per piece" (= ₹1,11,150 / 22.50)
28. [Browser] Add line item: "Making Charges" — 16.2gm × ₹400 = ₹6,480 → AED equivalent
29. [Browser] Select "Export under Bond/LUT" as GST type (zero-rated export, no GST)
30. [Browser] Click Save
31. [Verify]
    - Assert invoice is in AED currency
    - Assert GST = 0 (export zero-rated under LUT)
    - Assert AED amount shown with INR equivalent
    - Assert exchange rate ₹22.50 is recorded on the invoice

## PHASE 4: Record AED Payment
32. [Browser] Find the invoice and click "Record Payment"
33. [Browser] Fill "14,820 AED" in Payment Amount (3 × 4,940)
34. [Browser] Select "AED" as payment currency
35. [Browser] Fill "22.85" in Actual Exchange Rate (market rate slightly different)
36. [Browser] Fill "Wire Transfer — Dubai Islamic Bank" in payment mode/reference
37. [Browser] Click Save
38. [Verify]
    - Assert payment recorded in AED
    - Assert INR equivalent calculated at actual rate 22.85
    - Assert exchange gain/loss = (22.85 − 22.50) × 14,820 = ₹5,187 gain

## PHASE 5: Exchange Gain/Loss Reconciliation
39. [Browser] Navigate to Accounting (path: /accounting)
40. [Browser] Find or navigate to Foreign Exchange section or Journal Entries
41. [Verify]
    - Assert a forex gain/loss journal entry of ₹5,187 is auto-created or can be recorded
    - Assert the entry is categorized as "Foreign Exchange Gain"

## PHASE 6: GSTR-1 Verification (Export)
42. [Browser] Navigate to GST Reports (path: /gst-reports)
43. [Verify]
    - Assert the AED export invoice appears under "Export Invoices" in GSTR-1
    - Assert the invoice shows as zero-rated (0% IGST)
    - Assert taxable value shows the INR equivalent
