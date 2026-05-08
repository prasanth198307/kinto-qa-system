# F26 — Standard ERP Gaps: Budget → Fixed Assets → Purchase Requisition → Approval Workflow → Cost Centre → GSTR Reports
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Budget Management
4. [Browser] Navigate to Budgets within Accounting or Finance module
5. [Verify] Assert Budget screen is visible (may be at /accounting or a budget sub-section)
6. [Browser] Click "+ Create Budget"
7. [Browser] Fill "FY 2024-25 Operations Budget" in Budget Name
8. [Browser] Set period: April 2024 to March 2025
9. [Browser] Add budget line: "Materials" — ₹50,00,000
10. [Browser] Add budget line: "Labour (Making Charges)" — ₹10,00,000
11. [Browser] Add budget line: "Marketing" — ₹2,00,000
12. [Browser] Click Save
13. [Verify] Assert budget created with total ₹62,00,000

## PHASE 2: Fixed Assets
14. [Browser] Navigate to Fixed Assets (path: /fixed-assets)
15. [Verify] Assert Fixed Assets screen is visible
16. [Browser] Click "+ Add Asset"
17. [Browser] Fill "Weighing Scale — Mettler Toledo" in Asset Name
18. [Browser] Fill "5" in Useful Life (years)
19. [Browser] Fill "85000" in Purchase Cost
20. [Browser] Select "Straight Line" as Depreciation Method
21. [Browser] Set Purchase Date to today − 365 days (1 year ago)
22. [Browser] Click Save
23. [Verify]
    - Assert asset created with annual depreciation = ₹17,000/year (₹85,000 ÷ 5)
    - Assert Net Book Value = ₹68,000 (₹85,000 − ₹17,000 after 1 year)

## PHASE 3: Purchase Requisition
24. [Browser] Navigate to Purchase Requisitions (path: /purchase-requisitions)
25. [Browser] Click "+ New Requisition"
26. [Browser] Fill "Gold Wire — 22K, 500gm" in item description
27. [Browser] Fill "500" in Quantity (gm)
28. [Browser] Fill "Finance Department" in Requested By
29. [Browser] Select urgency "High"
30. [Browser] Click Submit
31. [Verify] Assert requisition created with status "Pending Approval"
32. [Browser] Click "Convert to PO" or approve and convert
33. [Verify] Assert purchase order created from the requisition

## PHASE 4: Approval Workflow
34. [Browser] Navigate to Approvals (path: /approvals)
35. [Verify] Assert Approval Inbox is visible
36. [Browser] Find any pending approval item (the purchase requisition from Phase 3 or an expense)
37. [Browser] Click Approve
38. [Verify] Assert item approved; approval action recorded with timestamp and approver

## PHASE 5: Cost Centres
39. [Browser] Navigate to Cost Centres (path: /cost-centres)
40. [Verify] Assert Cost Centres screen is visible
41. [Browser] Click "+ Add Cost Centre"
42. [Browser] Fill "Production Workshop" in Cost Centre Name
43. [Browser] Fill "CC-PROD-001" in Code
44. [Browser] Click Save
45. [Verify] Assert "Production Workshop" cost centre created
46. [Browser] Click "+ Add Cost Centre" again
47. [Browser] Fill "Retail Counter" in Name, "CC-RETL-001" in Code, Save
48. [Verify] Assert both cost centres exist

## PHASE 6: Assign Cost Centre to Expense
49. [Browser] Navigate to Expense Claims (path: /hr/expense-claims)
50. [Browser] Create new claim with employee "Kavita Sharma" (or any employee)
51. [Browser] Add expense: "Gold polish machine maintenance — ₹3,500"
52. [Browser] Select "Production Workshop" in Cost Centre field
53. [Browser] Click Submit
54. [Verify] Assert expense claim assigned to Production Workshop cost centre

## PHASE 7: GSTR-1 Report
55. [Browser] Navigate to GST Reports (path: /gst-reports)
56. [Verify]
    - Assert GSTR-1 tab is visible
    - Assert B2B Invoices summary shows invoices with GSTIN customers
    - Assert B2C summary shows POS/retail sales
    - Assert Export Invoices section shows AED invoice (from F24 if run)

## PHASE 8: GSTR-3B Report
57. [Browser] Click GSTR-3B tab
58. [Verify]
    - Assert GSTR-3B monthly aggregate view is visible
    - Assert output tax (CGST + SGST on domestic sales) is shown
    - Assert input tax credit (purchases) is shown
    - Assert Net Tax Payable is computed

## PHASE 9: JSON Export
59. [Browser] Click "Export JSON" or "Download for GST Portal" button
60. [Verify] Assert a JSON file is downloaded or a download link appears
