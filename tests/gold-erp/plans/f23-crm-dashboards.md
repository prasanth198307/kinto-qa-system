# F23 — CRM Dashboards & Reports: Pipeline, Funnel, Campaign ROI, Scheme Member Analytics
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: CRM Pipeline Dashboard
4. [Browser] Navigate to CRM (path: /crm)
5. [Verify] Assert CRM dashboard or pipeline view is visible
6. [Browser] Navigate to Leads (path: /crm/leads)
7. [Verify]
    - Assert leads list is visible
    - Assert at least 1 lead exists (from F15 if run, or create one)
    - Assert pipeline stages are shown: New, Contacted, Qualified, Proposal, Negotiation, Won, Lost

## PHASE 2: Add Leads for Pipeline Funnel
8. [Browser] Create 3 leads for pipeline testing:
    Lead 1: "Amit Shah", Mobile 9911223344, status "New"
    Lead 2: "Rekha Verma", Mobile 9922334455, status "Qualified"
    Lead 3: "Sunil Patel", Mobile 9933445566, status "Proposal Sent"
9. [Verify] Assert 3 new leads appear in the leads list

## PHASE 3: Funnel Analysis
10. [Browser] Navigate to CRM Reports or Analytics within CRM
11. [Verify]
    - Assert pipeline funnel shows counts per stage
    - Assert total leads count is ≥ 3 (from the ones just created plus any existing)
    - Assert conversion rate or funnel metrics are displayed

## PHASE 4: Campaign ROI Report
12. [Browser] Navigate to Campaigns section in CRM
13. [Verify] Assert campaigns list is visible with "Diwali Gold Rush 2024" (from F15)
14. [Browser] Open "Diwali Gold Rush 2024" campaign or any campaign
15. [Verify]
    - Assert campaign shows total leads generated
    - Assert budget vs conversions summary (ROI indicator) is visible or computable
    - Assert campaign status and dates are correct

## PHASE 5: Chit Scheme Member Analytics
16. [Browser] Navigate to Chit Schemes (path: /gold-erp?section=chit)
17. [Verify] Assert chit scheme "Gold Savings 11+1" is visible (from F3)
18. [Browser] Open the scheme details or analytics view
19. [Verify]
    - Assert total members enrolled is shown (at least Lakshmi Devi from F3)
    - Assert total collection to date is shown (₹15,000 from F3 if run)
    - Assert defaulter count is shown (0 or 1 depending on F3 execution)

## PHASE 6: Loyalty Program Analytics
20. [Browser] Navigate to Loyalty (path: /gold-erp?section=loyalty)
21. [Verify] Assert Loyalty screen is visible
22. [Verify]
    - Assert at least one loyalty member exists (Meena Reddy from master data)
    - Assert points balance and redemption history are visible
    - Assert top loyalty members by points are shown

## PHASE 7: MIS Dashboard (Gold ERP Quick Link)
23. [Browser] Navigate to Gold ERP overview (path: /gold-erp?section=overview)
24. [Browser] Click the "MIS Dashboard" quick-link tile
25. [Verify] Assert MIS Dashboard page loads (path: /mis)
26. [Verify]
    - Assert MIS dashboard shows revenue metrics
    - Assert inventory value card is visible
    - Assert charts or graphs render without errors
