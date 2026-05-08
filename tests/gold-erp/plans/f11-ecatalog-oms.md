# F11 — E-Catalog + OMS: Create Catalogue → Share → Enquiry → OMS Order → Dispatch Notification
# NOTE: WhatsApp send step is simulated (no actual WhatsApp message sent)
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Create E-Catalog
4. [Browser] Navigate to E-Catalog (path: /gold-erp?section=ecatalog)
5. [Verify] Assert E-Catalog screen is visible
6. [Browser] Click "+ Create Catalog" or "New Catalog" button
7. [Browser] Fill "Diwali Collection 2024" in Catalog Name
8. [Browser] Fill "diwali2024" in Access Code / Password field if present
9. [Browser] Add items to the catalog — search for or enter "DT-0042", "DT-0044", "DT-0055"
10. [Browser] Set validity period (today to today + 30 days)
11. [Browser] Click Save / Publish
12. [Verify]
    - Assert catalog "Diwali Collection 2024" created with status Active
    - Assert catalog has 3 items listed
    - Assert a shareable link or catalog URL is shown

## PHASE 2: Share Catalog (WhatsApp — simulated)
13. [Browser] Click "Share" or "Send via WhatsApp" button
14. [Verify] Assert a share dialog or WhatsApp link appears (actual sending is skipped in automation)
15. [Browser] Copy or note the catalog URL shown

## PHASE 3: Simulate Customer Enquiry via OMS
16. [Browser] Navigate to OMS Orders (path: /gold-erp?section=oms-orders)
17. [Verify] Assert OMS Orders screen is visible
18. [Browser] Click "+ New Order" or "Record Enquiry"
19. [Browser] Fill "Priya Jewellers" in Customer Name
20. [Browser] Fill "9887654321" in Phone
21. [Browser] Fill "36AAACP1234A1Z5" in GSTIN if present
22. [Browser] Add item "DT-0042 — 22K Necklace" to the order
23. [Browser] Fill "2" in Quantity
24. [Browser] Fill the catalog reference "Diwali Collection 2024"
25. [Browser] Set order date to today
26. [Browser] Click Save
27. [Verify]
    - Assert OMS order created with unique order number (OMO-001 or similar)
    - Assert status is "Enquiry" or "Pending Confirmation"

## PHASE 4: Confirm and Process OMS Order
28. [Browser] Open the OMS order
29. [Browser] Change status to "Confirmed" or click "Confirm Order"
30. [Browser] Click Save
31. [Verify] Assert order status changes to Confirmed

## PHASE 5: Dispatch Notification (OMS Notify — simulated)
32. [Browser] Navigate to OMS Notifications (path: /gold-erp?section=oms-notify)
33. [Verify] Assert OMS Notifications/config screen is visible
34. [Browser] Look for the confirmed order and click "Send Dispatch Notification" if available
35. [Verify] Assert notification action is available and can be triggered (actual sending skipped)
36. [Verify] Assert OMS order shows dispatch notification date or status updated
