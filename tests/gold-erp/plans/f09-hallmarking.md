# F9 — Hallmarking Batch: Submit to BIS Centre → Receive HUIDs → Update Items
# Create hallmarking batch → submit to BIS → receive HUIDs back → update item master
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Create Hallmarking Batch (Batch Submission)
4. [Browser] Navigate to Hallmarking Batch Submission (path: /gold-erp?section=hallmarking-batches)
5. [Verify] Assert "Hallmarking — Batch Submission" screen is visible
6. [Browser] Click "+ New Batch" or Create Batch button
7. [Browser] Fill "HB-2024-001" in Batch Reference or leave auto-generated
8. [Browser] Fill "BIS Hallmarking Centre — Hyderabad" in Centre Name
9. [Browser] Set submission date to today
10. [Browser] Add items to the batch:
    - Fill "DT-0042" in first item field (22K Necklace, 16.2 gm)
    - Fill "DT-0044" in second item field if multi-item entry is supported
11. [Browser] Fill "2" in Total Items if required
12. [Browser] Click Submit Batch / Save
13. [Verify]
    - Assert batch HB-2024-001 created with status "Submitted"
    - Assert items DT-0042 and DT-0044 are listed in the batch
    - Assert submission date is today

## PHASE 2: Track Batch Status
14. [Browser] View the batch record
15. [Browser] Update batch status to "At Centre" or "In Progress" if that field exists
16. [Browser] Fill "Expected return: 5 days" in Notes
17. [Browser] Click Save
18. [Verify] Assert batch status updated

## PHASE 3: Record HUID on Return (HUID Records)
19. [Browser] Navigate to Hallmarking HUID Records (path: /gold-erp?section=hallmarking)
20. [Verify] Assert "Hallmarking — HUID Records" screen is visible with note about HUIDs auto-populating from received batches
21. [Browser] Click "+ Add HUID Record" or find the entry form
22. [Browser] Fill "DT-0042" in Item/Tag field
23. [Browser] Fill "HUID-AB1234567" in HUID Number field
24. [Browser] Select "22K (916)" as hallmark purity
25. [Browser] Fill "HB-2024-001" in Batch Reference
26. [Browser] Set hallmarking date to today
27. [Browser] Click Save
28. [Verify] Assert HUID record created for DT-0042 with HUID-AB1234567

29. [Browser] Add second HUID record
30. [Browser] Fill "DT-0044" in Item field, "HUID-AB1234568" in HUID, same batch
31. [Browser] Click Save
32. [Verify] Assert second HUID record saved

## PHASE 4: Update Batch as Received
33. [Browser] Navigate back to Hallmarking Batches (path: /gold-erp?section=hallmarking-batches)
34. [Browser] Open batch HB-2024-001
35. [Browser] Update status to "Received" or "Completed"
36. [Browser] Fill "Both items HUID assigned" in completion notes
37. [Browser] Click Save
38. [Verify]
    - Assert batch status = Received/Completed
    - Assert items DT-0042 and DT-0044 now show as hallmarked in the batch
39. [Verify] Assert HUID Records screen now shows the hallmarked items with their HUIDs (confirming the link between batch submission and HUID records works correctly)
