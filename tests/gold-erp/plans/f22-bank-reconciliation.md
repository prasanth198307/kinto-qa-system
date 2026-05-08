# F22 — Bank Reconciliation: Import HDFC Statement → Auto-match → Handle Charges → Outstanding → Report
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Pre-setup — Create Bank Transactions in ERP
4. [Browser] Navigate to Accounting / Banking (path: /accounting)
5. [Browser] Record a payment received: "Priya Jewellers payment — ₹20,370" (invoice payment) — date today
6. [Browser] Record another payment: "Meena Reddy cash — ₹1,11,473" via bank transfer — date today
7. [Browser] Record bank charge: "HDFC SMS charges — ₹25" debit — date today
8. [Browser] Record "Riddhi Siddhi Bullion advance payment — ₹7,41,600" — date today
9. [Verify] Assert all 4 transactions recorded in the ERP ledger

## PHASE 2: Import Bank Statement (simulated)
10. [Browser] Navigate to Bank Reconciliation section within Accounting
11. [Verify] Assert Bank Reconciliation screen is visible
12. [Browser] Click "Import Statement" or "Upload CSV"
13. [Browser] If file upload exists, look for a way to manually enter statement entries or use a sample CSV import
14. [Browser] Manually add statement entries if direct import is not available:
    - CR ₹20,370 — "Priya Jewellers NEFT" — today
    - CR ₹1,11,473 — "Meena Reddy UPI" — today
    - DR ₹25 — "HDFC SMS charges" — today
    - DR ₹7,41,600 — "Riddhi Siddhi advance" — today
    - CR ₹500 — "Unknown credit — interest" — today (unmatched)
15. [Browser] Click Save / Import
16. [Verify] Assert statement lines are imported/visible in reconciliation screen

## PHASE 3: Auto-Match Transactions
17. [Browser] Click "Auto Match" or "Reconcile" button
18. [Verify]
    - Assert ₹20,370 Priya Jewellers matches the ERP invoice payment
    - Assert ₹1,11,473 Meena Reddy matches the POS payment
    - Assert ₹7,41,600 Riddhi Siddhi matches the bullion payment
    - Assert ₹25 bank charge is matched or flagged as bank charge

## PHASE 4: Handle Bank Charge (Unmatched)
19. [Browser] Find the ₹25 SMS charge in unmatched items
20. [Browser] Click "Record as Bank Charge" or manually categorize it
21. [Browser] Select expense category "Bank Charges"
22. [Browser] Click Save
23. [Verify] Assert ₹25 is now matched/categorized as bank charge

## PHASE 5: Outstanding Unmatched Credit
24. [Browser] Find the ₹500 unknown credit in unmatched items
25. [Browser] Mark it as "Outstanding — pending investigation"
26. [Browser] Fill "Unknown credit — check with bank" in notes
27. [Verify] Assert ₹500 remains as unmatched/outstanding

## PHASE 6: Reconciliation Report
28. [Browser] Click "Close Reconciliation" or "View Report"
29. [Verify]
    - Assert reconciliation report shows:
      - Total credits matched: ₹1,31,843 (₹20,370 + ₹1,11,473)
      - Bank charges: ₹25
      - Payment outward: ₹7,41,600
      - Outstanding unmatched: ₹500
    - Assert reconciliation balance difference is ₹500 (the unmatched credit)
    - Assert report can be exported or printed
