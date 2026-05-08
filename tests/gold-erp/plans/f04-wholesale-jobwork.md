# F4 — Wholesale Jobwork (Customer's Own Gold)
# Customer sends their own gold → create jobwork order → assign karigar → save → verify listing
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads (URL is not /auth)

## PHASE 1: Create Wholesale Jobwork Order
4. [Browser] Navigate to /gold-erp?section=wholesale-jobwork
5. [Verify] Assert "Wholesale Jobwork (Customer Gold)" heading is visible
6. [Browser] Click button with data-testid="button-new-jobwork"
7. [Verify] Assert dialog "New Wholesale Jobwork Order" opens
8. [Browser] Fill "Priya Jewellers" in input with data-testid="input-jobwork-customer"
9. [Browser] Fill "50.0" in input with data-testid="input-jobwork-gold-recv"
10. [Browser] Fill "400" in input with data-testid="input-jobwork-making-charges"
11. [Browser] Click trigger with data-testid="select-jobwork-karigar" and select "Raju Goldsmith"
12. [Browser] Fill "50.0" in input with data-testid="input-jobwork-gold-issued"
13. [Browser] Click button with data-testid="button-save-jobwork"
14. [Verify]
    - Assert toast "Jobwork order created" appears
    - Assert a row for "Priya Jewellers" appears in the table
    - Assert the order has a jobwork number (e.g. WJ-001)

## PHASE 2: Update Order Status (simulate production progress)
15. [Browser] Click the edit button in the Priya Jewellers row (data-testid="button-edit-jobwork-{id}")
16. [Verify] Assert dialog "Update Wholesale Jobwork" opens
17. [Browser] Click the Status select trigger and choose "in_progress"
18. [Browser] Click button with data-testid="button-save-jobwork"
19. [Verify]
    - Assert toast "Updated" appears
    - Assert Priya Jewellers row shows "in progress" status badge

## PHASE 3: Mark as Completed with Finished Weight
20. [Browser] Click the edit button on Priya Jewellers row again
21. [Browser] Select "completed" as status
22. [Browser] Fill "48.5" in Finished Weight (g) field
23. [Browser] Fill "1.5" in Gold Balance to Return (g) field
24. [Browser] Set Delivery Date to today
25. [Browser] Click data-testid="button-save-jobwork"
26. [Verify]
    - Assert toast "Updated" appears
    - Assert Priya Jewellers row shows "completed" status
