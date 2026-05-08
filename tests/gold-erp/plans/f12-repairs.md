# F12 — Repairs & Remodeling: Counter Booking → Receive Broken Necklace → Issue Gold → Karigar → Invoice → Delivery
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Counter Booking for Repair
4. [Browser] Navigate to Counter Bookings (path: /gold-erp?section=counter-bookings)
5. [Verify] Assert Counter Bookings screen is visible
6. [Browser] Click "+ New Booking" button
7. [Browser] Fill "Meena Reddy" in Customer Name
8. [Browser] Fill "9898989898" in Phone
9. [Browser] Select "Repair" as booking type
10. [Browser] Fill "Broken necklace clasp — 22K gold necklace" in Item Description
11. [Browser] Fill "15.8" in Item Weight (gm)
12. [Browser] Fill "6820" in Today's Rate
13. [Browser] Set expected ready date to today + 3 days
14. [Browser] Click Save
15. [Verify]
    - Assert counter booking created with reference number (CB-001 or similar)
    - Assert status is "Received" or "In Queue"
    - Assert customer token/receipt number shown

## PHASE 2: Open Repairs Module
16. [Browser] Navigate to Repairs (path: /gold-erp?section=repairs)
17. [Verify] Assert Repairs screen is visible
18. [Browser] Find the repair job for Meena Reddy or click "+ New Repair"
19. [Browser] Link to the counter booking CB-001 if applicable
20. [Browser] Fill "Meena Reddy" in Customer field
21. [Browser] Fill "Broken 22K necklace — clasp and 3 links damaged" in Description
22. [Browser] Fill "15.8" in Received Weight (gm)
23. [Browser] Select "Raju Goldsmith" as assigned karigar
24. [Browser] Fill "0.5" in Estimated Gold Addition (gm) — gold to add for repair
25. [Browser] Fill "500" in Estimated Repair Charge (₹)
26. [Browser] Click Save
27. [Verify] Assert repair job created and assigned to Raju Goldsmith

## PHASE 3: Issue Gold for Repair
28. [Browser] Update the repair job — fill "0.5" in Gold Issued (gm) to karigar for repair
29. [Browser] Click Save / Update
30. [Verify] Assert 0.5 gm gold issued to karigar noted on repair record

## PHASE 4: Receive Repaired Item
31. [Browser] Update repair status to "Completed" or click "Mark Repaired"
32. [Browser] Fill "16.3" in Returned Weight (gm) — original 15.8 + 0.5 added
33. [Browser] Fill "QC passed — clasp repaired, links replaced" in completion notes
34. [Browser] Set completion date to today
35. [Browser] Click Save
36. [Verify] Assert repair marked complete with returned weight 16.3 gm

## PHASE 5: Generate Repair Invoice
37. [Browser] Click "Generate Invoice" on the repair job
38. [Verify]
    - Assert invoice shows repair charges ₹500
    - Assert gold addition: 0.5 gm × ₹6,820 = ₹3,410
    - Assert GST on making (5%) = ₹25
    - Assert Total ≈ ₹3,935
39. [Browser] Click Save Invoice
40. [Verify] Assert invoice created for Meena Reddy

## PHASE 6: Customer Delivery & Sign-off
41. [Browser] Mark the repair as "Delivered" or click Delivery Sign-off
42. [Browser] Fill "Customer signature: Meena Reddy" or mark delivery confirmed
43. [Browser] Click Save
44. [Verify]
    - Assert repair status = Delivered
    - Assert delivery date recorded as today
    - Assert invoice shows as paid or pending payment
