# F9 — Hallmarking: Batch + HUID Record
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a new browser context
2. [Browser] Navigate to /auth
3. [Browser] Fill "gold-erp-demo" in Company ID, "goldadmin" in Username, "Gold@1234" in Password, click Sign In
4. [Verify] Assert URL is NOT /auth

5. [Browser] Navigate to /gold-erp?section=hallmarking-batches
6. [Verify] Assert "Hallmarking Batches" heading visible
7. [Browser] Click [data-testid="button-new-hallmark-batch"]
8. [Verify] Assert dialog opens
9. [Browser] Fill "BIS Centre Hyderabad" in [data-testid="input-batch-centre"]
10. [Browser] Click [data-testid="button-save-hallmark-batch"]
11. [Verify] Assert toast "Batch saved" appears and a card with "BIS Centre Hyderabad" is visible

12. [Browser] Navigate to /gold-erp?section=hallmarking
13. [Verify] Assert "Hallmarking Register" heading visible
14. [Browser] Click [data-testid="button-add-hallmark-record"]
15. [Verify] Assert dialog "New Hallmarking Record" opens
16. [Browser] Fill "22K Gold Necklace" in Item Description textarea
17. [Browser] Fill "16.2" in [data-testid="input-hallmark-gross-weight"]
18. [Browser] Fill "15.8" in [data-testid="input-hallmark-net-weight"]
19. [Browser] Fill "BIS Centre Hyderabad" in [data-testid="input-hallmark-assay-centre"]
20. [Browser] Click [data-testid="button-save-hallmark-record"]
21. [Verify]
    - Assert toast "Hallmark record created — HUID generated" appears
    - Assert a row appears in the Hallmarking Register table
    - Assert the HUID column shows an auto-generated value (non-empty string)
    - Assert item description contains "22K Gold Necklace"
