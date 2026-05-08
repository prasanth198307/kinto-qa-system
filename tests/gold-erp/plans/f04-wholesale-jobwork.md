# F4 — Wholesale Jobwork — Customer's Own Gold
# Customer sends their own gold → record receipt → issue to karigar → receive pieces → invoice making charges only
# PRE-REQ: Karigar Raju Goldsmith exists, Metal rates set
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Customer Jobwork Order
4. [Browser] Navigate to Customer Jobwork section (path: /gold-erp?section=wholesale-jobwork)
5. [Verify] Assert "Customer Jobwork (Customer's Gold)" screen is visible
6. [Browser] Click "+ New Order" or Create Order button
7. [Browser] Fill "Priya Jewellers" in Customer Name field
8. [Browser] Fill "36AAACP1234A1Z5" in GSTIN field if present
9. [Browser] Select "Gold" as metal type
10. [Browser] Select "22K (916)" as purity
11. [Browser] Fill "50.0" in Gold Received from Customer (gm)
12. [Browser] Fill "DS-CHAIN-001" or "Cable chain 22K" in Design/Description field
13. [Browser] Fill "10" in Quantity
14. [Browser] Fill "400" in Making Charge per gram
15. [Browser] Select "Raju Goldsmith" as assigned karigar
16. [Browser] Set expected delivery date to today + 14 days
17. [Browser] Click Save
18. [Verify]
    - Assert order created with a unique order number (e.g. WJ-001)
    - Assert customer gold receipt of 50.0 gm is recorded
    - Assert note "Customer's Gold — not from our stock" or similar disclaimer

## PHASE 2: Issue Gold to Karigar
19. [Browser] Open the newly created jobwork order
20. [Browser] Click "Issue to Karigar" or update status to In Production
21. [Browser] Fill "50.0" in Gold Issued to Karigar (gm)
22. [Browser] Click Save
23. [Verify] Assert gold issued to Raju Goldsmith: 50.0 gm of customer's gold

## PHASE 3: Receive Finished Pieces
24. [Browser] Update the order to received state
25. [Browser] Fill "48.5" in Gold Returned in Pieces (gm) — received back after making
26. [Browser] Fill "1.2" in Wastage (gm)
27. [Browser] Fill "0.3" in Karigar Wastage Returned (gm) if applicable
28. [Browser] Set received date to today
29. [Browser] Click Save / Mark Received
30. [Verify] Assert received weight 48.5 gm is recorded; order status changes to Received

## PHASE 4: Generate Making Charge Invoice
31. [Browser] Click "Create Invoice" or "Generate Bill" on the jobwork order
32. [Verify]
    - Assert invoice is for making charges only (not gold value — customer's own gold)
    - Assert Making Charge = 48.5 gm × ₹400 = ₹19,400
    - Assert GST @ 5% on making = ₹970
    - Assert Total Invoice = ₹20,370
33. [Browser] Click Save / Confirm Invoice
34. [Verify] Assert invoice created for Priya Jewellers — ₹20,370

## PHASE 5: Verify Metal Ledger Not Debited
35. [Browser] Navigate to Metal Ledger (path: /gold-erp?section=metal-ledger)
36. [Verify]
    - Assert Priya Jewellers' gold receipt (50 gm) is tracked but tagged as "Customer's Gold"
    - Assert this transaction does NOT reduce own bullion stock (it's customer property)
