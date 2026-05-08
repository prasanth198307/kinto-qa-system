# F8 — Metal Ledger End-of-Day Reconciliation
# Purchase gold → issue to karigar → receive piece → sell to customer → verify ledger balances to zero
# PRE-REQ: Metal rates, Karigar Raju Goldsmith exist
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Record Bullion Inward (Purchase)
4. [Browser] Navigate to Bullion Stock (path: /gold-erp?section=bullion)
5. [Browser] Click "+ Record Transaction" / "New Inward"
6. [Browser] Select "Purchase" as type, fill "MMTC Supplier" as party
7. [Browser] Metal "Gold", Purity "22K (916)", Weight "20.0" gm, Rate "6820"
8. [Browser] Click Save
9. [Verify] Assert bullion inward 20.0 gm recorded. Running stock increases.

## PHASE 2: Issue to Karigar (via Production Order)
10. [Browser] Navigate to Production (path: /gold-erp?section=production)
11. [Browser] Create a new order: Karigar "Raju Goldsmith", Gold 22K, issue "17.0" gm
12. [Browser] Click Save
13. [Verify] Assert production order created; bullion stock reduces by 17.0 gm (net = 3.0 gm remaining)

## PHASE 3: Receive Piece Back
14. [Browser] Navigate to Job Finalize (path: /gold-erp?section=finalize)
15. [Browser] Open the production order and enter received weight "16.2" gm
16. [Browser] Mark as completed
17. [Verify] Assert job finalized; piece weight 16.2 gm credited to finished goods

## PHASE 4: Sell at Jewellery POS
18. [Browser] Navigate to Jewellery POS (path: /gold-erp?section=jewellery-pos)
19. [Browser] Create a new sale bill
20. [Browser] Add the piece (16.2 gm 22K gold item) to the bill
21. [Browser] Add customer "Meena Reddy", complete the sale
22. [Verify] Assert bill created and finished goods stock reduces by 16.2 gm

## PHASE 5: Metal Ledger End-of-Day Check
23. [Browser] Navigate to Metal Ledger (path: /gold-erp?section=metal-ledger)
24. [Verify] Assert Metal Ledger screen is visible with transaction history
25. [Verify]
    - Assert an inward entry of +20.0 gm (bullion purchase from MMTC)
    - Assert an outward entry of -17.0 gm (issued to Karigar Raju)
    - Assert a received entry of +16.2 gm (piece received back)
    - Assert outward sale entry of -16.2 gm (sold at POS)
    - Assert running balance accounts for all transactions
26. [Verify] Assert the metal ledger shows a remaining balance of approximately 3.0 gm (the unused bullion from the original 20 gm purchase that was not issued to karigar)
27. [Verify] Assert no unexplained discrepancies in the metal ledger for today's transactions
