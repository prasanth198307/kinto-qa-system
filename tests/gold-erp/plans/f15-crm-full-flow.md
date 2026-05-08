# F15 — CRM Full Flow: Campaign → Lead → Enquiry → Quotation → Conversion → Customer 360 → Helpdesk → Feedback
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Create Campaign
4. [Browser] Navigate to CRM (path: /crm)
5. [Verify] Assert CRM module loads
6. [Browser] Navigate to Campaigns section within CRM
7. [Browser] Click "+ New Campaign"
8. [Browser] Fill "Diwali Gold Rush 2024" in Campaign Name
9. [Browser] Select "WhatsApp" or "Email" as channel
10. [Browser] Set campaign dates (today to today + 30)
11. [Browser] Fill "₹5,000 budget" in Budget field if present
12. [Browser] Click Save
13. [Verify] Assert campaign created with status Active

## PHASE 2: Create Lead
14. [Browser] Navigate to Leads section in CRM
15. [Browser] Click "+ New Lead"
16. [Browser] Fill "Sunita Agarwal" in Name
17. [Browser] Fill "9977665544" in Mobile
18. [Browser] Fill "sunita@example.com" in Email
19. [Browser] Select "Diwali Gold Rush 2024" campaign as source
20. [Browser] Select "High" as lead priority
21. [Browser] Fill "Interested in 22K necklace set" in Notes
22. [Browser] Click Save
23. [Verify] Assert lead created for Sunita Agarwal

## PHASE 3: Convert Lead to Enquiry
24. [Browser] Open Sunita Agarwal's lead record
25. [Browser] Click "Convert to Enquiry" or change status to Enquiry
26. [Browser] Fill enquiry details — product interest: "22K Necklace Set, budget ₹1.5L"
27. [Browser] Click Save
28. [Verify] Assert lead status changes to Enquiry; enquiry record created

## PHASE 4: Create Quotation from Enquiry
29. [Browser] From the enquiry, click "Create Quotation" or navigate to quotations
30. [Browser] Fill item: "22K Plain Necklace Set, 16.2gm"
31. [Browser] Fill rate ₹6,820/gm, making ₹400/gm
32. [Browser] Click Save
33. [Verify] Assert quotation created with value approximately ₹1,11,473

## PHASE 5: Convert Quotation to Customer / Sale
34. [Browser] Click "Convert to Customer" or "Won" status on the quotation
35. [Verify] Assert customer record created for Sunita Agarwal; lead marked as Won/Converted

## PHASE 6: Customer 360° View
36. [Browser] Open Sunita Agarwal's customer profile
37. [Verify]
    - Assert Customer 360 view shows: lead history, enquiry, quotation, and conversion
    - Assert contact details, mobile, email are correct
    - Assert campaign source attribution shown

## PHASE 7: Helpdesk Ticket
38. [Browser] Navigate to CRM Support or Helpdesk section
39. [Browser] Click "+ New Ticket"
40. [Browser] Select "Sunita Agarwal" as customer
41. [Browser] Fill "Delivery delay complaint — necklace not received" in Subject
42. [Browser] Select "High" priority
43. [Browser] Click Save
44. [Verify] Assert ticket created with status Open

45. [Browser] Resolve the ticket — update status to "Resolved"
46. [Browser] Fill "Dispatched via courier, tracking HDFC123" in Resolution Notes
47. [Browser] Click Save
48. [Verify] Assert ticket status = Resolved

## PHASE 8: Feedback / Survey
49. [Browser] Navigate to Surveys (path: /crm/surveys)
50. [Verify] Assert Surveys screen is visible
51. [Browser] Click "+ Create Survey"
52. [Browser] Fill "Post-Purchase Satisfaction Survey" in Survey Name
53. [Browser] Add a rating question: "How satisfied are you with your purchase? (1-5 stars)"
54. [Browser] Add a text question: "Any suggestions for improvement?"
55. [Browser] Click Save
56. [Verify] Assert survey created with 2 questions

57. [Browser] Record a response for Sunita Agarwal — rating 4 stars, comment "Beautiful necklace, fast delivery"
58. [Verify] Assert response recorded; survey shows 1 response
