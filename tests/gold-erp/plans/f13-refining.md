# F13 — Refining Process: Wastage Accumulation → Dispatch to Refinery → Receive Refined Gold → P&L
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Refining Entry — Accumulate Wastage
4. [Browser] Navigate to Refining (path: /gold-erp?section=refining)
5. [Verify] Assert Refining screen is visible
6. [Browser] Click "+ New Refining Entry" or "Record Wastage" button
7. [Browser] Fill "Accumulated sweepings — workshop floor and ghat" in Description
8. [Browser] Select "Gold" as metal type
9. [Browser] Fill "8.5" in Wastage Weight (gm) — accumulated sweeping weight
10. [Browser] Fill "55" in Estimated Purity % — impure wastage
11. [Browser] Set collection date to today
12. [Browser] Click Save
13. [Verify] Assert wastage batch of 8.5 gm recorded for refining

## PHASE 2: Dispatch to Refinery
14. [Browser] Find the wastage batch and click "Dispatch to Refinery"
15. [Browser] Fill "Suncity Refinery Pvt Ltd" in Refinery Name
16. [Browser] Fill "Mumbai Refinery" in Location
17. [Browser] Fill "REF-RECEIPT-2024-001" in Refinery Receipt Number
18. [Browser] Set dispatch date to today
19. [Browser] Fill "8.5" in Weight Dispatched (gm)
20. [Browser] Click Save / Confirm Dispatch
21. [Verify]
    - Assert dispatch recorded: 8.5 gm sent to Suncity Refinery
    - Assert status changes to "At Refinery" or "Dispatched"

## PHASE 3: Receive Refined Gold
22. [Browser] Update the refining entry to received state
23. [Browser] Click "Record Receipt" or update status to "Received"
24. [Browser] Fill "4.8" in Refined Gold Received (gm) — net refined output after losses
25. [Browser] Fill "99.5" in Purity of Received Gold (%)
26. [Browser] Fill "4750" in Rate per gram at receipt
27. [Browser] Set receipt date to today
28. [Browser] Click Save
29. [Verify]
    - Assert refined gold received: 4.8 gm at 99.5% purity
    - Assert refining loss = 3.7 gm (8.5 − 4.8) — sweeping impurities
    - Assert Refined Gold Value = 4.8 × ₹4,750 = ₹22,800

## PHASE 4: Metal Ledger Update
30. [Browser] Navigate to Metal Ledger (path: /gold-erp?section=metal-ledger)
31. [Verify]
    - Assert an inward entry for 4.8 gm refined gold is visible
    - Assert the entry is tagged as "Refining Receipt" or similar source type

## PHASE 5: Refining P&L
32. [Browser] Navigate back to Refining (path: /gold-erp?section=refining)
33. [Browser] Open the completed refining entry
34. [Verify]
    - Assert Cost of dispatch (if any transport/refinery charges) is recorded
    - Assert Refined gold value = ₹22,800
    - Assert Refining P&L shows gain/loss (value of refined gold vs cost of wastage)
    - Assert refining process record is in "Completed" status
