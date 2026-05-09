# F15 — CRM Full Flow: Lead → Status Progression → Table Search → Survey → Response
# Login: gold-erp-demo / goldadmin / Gold@1234
# NOTE: The original F15 plan referenced Campaigns, Quotations, Customer 360°, and CRM Helpdesk
# which are not implemented in the current CRM module.
# This revised plan covers what actually exists.

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Create Lead
4. [Browser] Navigate to /crm/leads
5. [Verify] Assert Lead Management page loads with Kanban view
6. [Browser] Click "Add Lead"
7. [Browser] Fill Name: "Sunita Agarwal <timestamp>"
8. [Browser] Fill Phone: 9977665544
9. [Browser] Fill Email: sunita@example.com
10. [Browser] Fill Product Interest: "22K Necklace Set, budget ₹1.5L"
11. [Browser] Fill Notes: "Interested in 22K necklace set"
12. [Browser] Select Source: Walk-in
13. [Browser] Click "Save Lead"
14. [Verify] Assert lead card appears in Kanban New column

## PHASE 2: Status Progression via Inline Buttons
15. [Browser] Find lead card in New column
16. [Browser] Click "→ Contacted" inline button on the card
17. [Verify] Card moves to Contacted column
18. [Browser] Click "→ Interested" inline button
19. [Verify] Card moves to Interested column
20. [Browser] Click "→ Qualified" inline button
21. [Verify] Card moves to Qualified column

## PHASE 3: Switch to Table View and Search
22. [Browser] Click "Table" view toggle button
23. [Browser] Type "Sunita" into the search box
24. [Verify] Assert lead row appears with Qualified status badge

## PHASE 4: Edit Lead — Mark Converted
25. [Browser] Click the Edit (pencil) button on Sunita's row in table view
26. [Browser] Change Status to "Converted"
27. [Browser] Click "Save Lead"
28. [Verify] Assert row now shows "Converted" status badge

## PHASE 5: Create Survey with 2 Questions
29. [Browser] Navigate to /crm/surveys
30. [Browser] Click "New Survey"
31. [Browser] Fill Survey Title: "Post-Purchase Satisfaction <timestamp>"
32. [Browser] Fill Description: "Help us improve your experience"
33. [Browser] Fill Q1 text: "How satisfied are you with your purchase? (1-5 stars)" — keep type=Rating
34. [Browser] Click "Add" to add Q2
35. [Browser] Fill Q2 text: "Any suggestions for improvement?" — set type=Text
36. [Browser] Click "Save Survey"
37. [Verify] Assert survey card appears on the page with the title

## PHASE 6: Record a Survey Response
38. [Browser] Click "Record Response" on the new survey card
39. [Browser] Fill Customer Name: "Sunita Agarwal"
40. [Browser] Fill Phone: 9977665544
41. [Browser] Click 4th star for the rating question
42. [Browser] Fill text answer: "Beautiful necklace, fast delivery"
43. [Browser] Click "Submit Response"
44. [Verify] Assert survey card now shows 1 response count
