# F5 — Bullion: Booking → Rate Cut Invoice → Vault Movement → Vault Audit
# Create bullion booking → rate cut invoice → vault movement → vault audit
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Bullion Booking
4. [Browser] Navigate to /gold-erp?section=bullion-bookings
5. [Verify] Assert "Bullion Bookings" heading is visible
6. [Browser] Click button with data-testid="button-new-bullion-booking"
7. [Verify] Assert dialog "New Bullion Booking" opens
8. [Browser] Fill "Riddhi Siddhi Bullion" in input with data-testid="input-booking-party"
9. [Browser] Fill "100.0" in input with data-testid="input-booking-weight"
10. [Browser] Fill "7200" in input with data-testid="input-booking-rate"
11. [Browser] Click button with data-testid="button-save-bullion-booking"
12. [Verify]
    - Assert toast "Bullion booking saved" appears
    - Assert row for "Riddhi Siddhi Bullion" appears in the bookings table
    - Assert amount column shows ₹7,20,000 (100 × 7200)

## PHASE 2: Rate Cut Invoice
13. [Browser] Navigate to /gold-erp?section=bullion-rate-cuts
14. [Verify] Assert "Bullion Rate Cut Invoices" heading is visible
15. [Browser] Click button with data-testid="button-add-rate-cut"
16. [Verify] Assert dialog "New Rate Cut Invoice" opens
17. [Browser] Fill "Riddhi Siddhi Bullion" in input with data-testid="input-ratecut-party"
18. [Browser] Fill "100.0" in input with data-testid="input-ratecut-weight"
19. [Browser] Fill "7200" in input with data-testid="input-ratecut-spot"
20. [Browser] Fill "0.7" in input with data-testid="input-ratecut-pct" (0.7% rate cut)
21. [Verify] Assert live calculation panel appears showing:
    - Net rate approximately ₹7,149.6/g
    - Grand total approximately ₹7,36,406
22. [Browser] Click button with data-testid="button-save-ratecut"
23. [Verify]
    - Assert toast "Rate cut invoice saved" appears
    - Assert invoice row appears in the table with Riddhi Siddhi Bullion

## PHASE 3: Vault Movement
24. [Browser] Navigate to /gold-erp?section=vault-movement
25. [Verify] Assert "Bullion Vault Movement Dashboard" heading is visible
26. [Browser] Click button with data-testid="button-add-vault-movement"
27. [Verify] Assert dialog "Record Vault Movement" opens
28. [Browser] Ensure "Inward" is selected as Movement Type
29. [Browser] Fill "100.0" in input with data-testid="input-vault-weight"
30. [Browser] Fill "Main Vault" in To Location field
31. [Browser] Click Save (find button by text "Save" in the dialog)
32. [Verify]
    - Assert toast "Vault movement recorded" appears
    - Assert movement row appears in the table with type "in" and weight 100.0 g
    - Assert balance card shows "gold" balance ≥ 100 g

## PHASE 4: Vault Audit
33. [Browser] Navigate to /gold-erp?section=vault-audit
34. [Verify] Assert "Vault Audit" heading is visible
35. [Browser] Click button with data-testid="button-start-vault-audit"
36. [Verify] Assert dialog "Start Vault Audit" opens
37. [Browser] Fill "Main Vault — Safe #1" in input with data-testid="input-vault-audit-location"
38. [Browser] Fill "Raju Goldsmith" in input with data-testid="input-vault-audit-auditor1"
39. [Browser] Click button with data-testid="button-save-vault-audit"
40. [Verify]
    - Assert toast "Vault audit saved" appears
    - Assert audit card appears in the list showing the location "Main Vault — Safe #1"
