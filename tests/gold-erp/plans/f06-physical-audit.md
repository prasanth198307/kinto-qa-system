# F6 — Physical Inventory Audit: Start → Record → Update with Discrepancy
# Start audit → record initial count → update with physical counts → check discrepancy
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Start Physical Audit
4. [Browser] Navigate to /gold-erp?section=physical-audit
5. [Verify] Assert "Physical Inventory Audit" heading is visible
6. [Browser] Click button with data-testid="button-start-physical-audit"
7. [Verify] Assert dialog "Start Physical Audit" opens
8. [Browser] Verify audit date is pre-filled with today
9. [Browser] Fill "Main Counter" in input with data-testid="input-audit-branch"
10. [Browser] Fill "Raju Goldsmith" in input with data-testid="input-audit-auditor"
11. [Browser] Click button with data-testid="button-save-physical-audit"
12. [Verify]
    - Assert toast "Audit saved" appears
    - Assert audit card appears in the list with branch "Main Counter"
    - Assert audit status badge shows "in progress"

## PHASE 2: Update Audit with Count Data
13. [Browser] Click button with data-testid="button-edit-physical-audit-{id}" (found in the new audit card)
14. [Verify] Assert dialog "Update Audit" opens
15. [Browser] Select "completed" as Status
16. [Browser] Fill "Approving Manager" in Approved By field
17. [Browser] Fill "25" in System Pieces field
18. [Browser] Fill "24" in Physical Pieces field (one missing — discrepancy)
19. [Browser] Fill "480.5" in System Weight (g) field
20. [Browser] Fill "461.3" in Physical Weight (g) field (discrepancy of 19.2g)
21. [Browser] Click button with data-testid="button-save-physical-audit"
22. [Verify]
    - Assert toast "Audit saved" appears
    - Assert audit card now shows status "completed"
    - Assert card shows System Pieces: 25, Physical Pieces: 24
    - Assert discrepancy value is shown (negative: -19.2g)
    - Assert card has red border (due to discrepancy) or discrepancy text is highlighted
