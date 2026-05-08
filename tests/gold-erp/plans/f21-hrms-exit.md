# F21 — HRMS Exit Process: Resignation → Exit Checklist → F&F Settlement → Experience Letter → Exit Interview
# NOTE: Multi-approver steps are sequenced as single-admin approval for automation
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Resignation
4. [Browser] Navigate to HR Employees (path: /hr/employees)
5. [Browser] Find or create a test employee "Rajesh Kumar" (if not exists, add one with basic salary ₹20,000)
6. [Browser] Open Rajesh Kumar's employee profile
7. [Browser] Look for "Resignation" or "Exit Process" option
8. [Browser] Click "Initiate Resignation" or "Record Resignation"
9. [Browser] Fill today's date as Resignation Date
10. [Browser] Fill today + 30 days as Last Working Day (1 month notice)
11. [Browser] Fill "Personal reasons — relocating to hometown" in Resignation Reason
12. [Browser] Click Submit / Save
13. [Verify] Assert resignation recorded; employee status changes to "Notice Period"

## PHASE 2: Exit Checklist
14. [Browser] Navigate to HR Onboarding (or Exit Checklist if separate) (path: /hr/onboarding)
15. [Browser] Find Rajesh Kumar's exit checklist or create one
16. [Browser] Mark checklist items:
    - "Company laptop returned" → Completed
    - "ID Card surrendered" → Completed
    - "Email access revoked" → Completed
    - "Gold issued verified as returned" → Completed (critical for jewellery shop — zero gold outstanding)
17. [Browser] Click Save
18. [Verify]
    - Assert exit checklist shows all items completed
    - Assert "Gold issued = Gold returned" is verified (zero gold outstanding)

## PHASE 3: Full & Final Settlement
19. [Browser] Navigate to Payroll or F&F Settlement section
20. [Browser] Run final payroll for Rajesh Kumar
21. [Verify]
    - Assert final salary calculated (prorated if partial month)
    - Assert leave encashment added if applicable
    - Assert any loans/advances deducted
    - Assert gratuity calculated if eligible (>5 years service)
22. [Browser] Process / approve F&F payment
23. [Verify] Assert F&F settlement record created with final payable amount

## PHASE 4: Experience Letter
24. [Browser] Navigate to HR Letters (path: /hr/letters)
25. [Browser] Click "+ Generate Letter"
26. [Browser] Select "Rajesh Kumar" as employee
27. [Browser] Select "Experience Letter" as letter type
28. [Browser] Verify letter content includes: Name, Designation, Employment Period, Department
29. [Browser] Click Issue Letter
30. [Verify] Assert experience letter generated with status "Issued"

## PHASE 5: Exit Interview
31. [Browser] Navigate to HR Support Desk or Exit Interview section (path: /hr/support-desk)
32. [Browser] Create a ticket or record for exit interview
33. [Browser] Fill "Exit Interview — Rajesh Kumar" in subject
34. [Browser] Fill interview feedback: "Work environment good, career growth limited"
35. [Browser] Select "Exit Interview" as category if available
36. [Browser] Click Save
37. [Verify] Assert exit interview recorded

## PHASE 6: Final Employee Status Update
38. [Browser] Navigate back to HR Employees (path: /hr/employees)
39. [Browser] Find Rajesh Kumar and verify his status
40. [Verify]
    - Assert employee status = "Resigned" or "Inactive" or "Separated"
    - Assert last working day is set
    - Assert F&F settlement is recorded
    - Assert experience letter is issued
