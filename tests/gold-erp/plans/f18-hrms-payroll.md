# F18 — HRMS Full Flow: Onboarding → Attendance → Leave → Payroll → PF/ESI → Expense → Appraisal → ESS
# NOTE: PF/ESI portal integration steps are simulated. 104 steps condensed to key assertions.
# Login: gold-erp-demo / goldadmin / Gold@1234

1. [New Context] Create a fresh browser context
2. [Browser] Navigate to /auth and sign in as gold-erp-demo / goldadmin / Gold@1234
3. [Verify] Assert dashboard loads

## PHASE 1: Employee Onboarding
4. [Browser] Navigate to HR (path: /hr/employees)
5. [Browser] Click "+ Add Employee"
6. [Browser] Fill "Kavita Sharma" in Name
7. [Browser] Fill "kavita.sharma@goldshop.com" in Email
8. [Browser] Fill "9900887766" in Mobile
9. [Browser] Select "Accountant" in Designation
10. [Browser] Fill "Finance" in Department
11. [Browser] Fill "25000" in Basic Salary
12. [Browser] Set joining date to today
13. [Browser] Click Save
14. [Verify] Assert employee "Kavita Sharma" created with employee ID

## PHASE 2: HR Onboarding Checklist
15. [Browser] Navigate to HR Onboarding (path: /hr/onboarding)
16. [Verify] Assert Onboarding screen is visible
17. [Browser] Find Kavita Sharma's onboarding checklist or create one
18. [Browser] Mark "ID Card issued" as completed
19. [Browser] Mark "System access granted" as completed
20. [Browser] Mark "Welcome kit given" as in-progress
21. [Browser] Click Save
22. [Verify] Assert onboarding checklist shows 2 completed, 1 in-progress tasks

## PHASE 3: Attendance
23. [Browser] Navigate to HR Attendance (path: /hr/attendance)
24. [Browser] Set date to today
25. [Browser] Mark Kavita Sharma as Present
26. [Browser] Mark Raju Goldsmith (if in HR) as Present
27. [Browser] Click Save Attendance
28. [Verify] Assert attendance saved for today

## PHASE 4: Leave Application
29. [Browser] Navigate to Leave Management (path: /hr/leave)
30. [Browser] Click "+ Apply Leave"
31. [Browser] Select "Kavita Sharma" as employee
32. [Browser] Select "Casual Leave" as leave type
33. [Browser] Set dates: tomorrow to tomorrow (1 day)
34. [Browser] Fill "Personal work" in reason
35. [Browser] Click Submit
36. [Verify] Assert leave application created with status Pending/Applied

37. [Browser] Approve the leave application as admin
38. [Verify] Assert leave status changes to Approved

## PHASE 5: Run Payroll
39. [Browser] Navigate to Payroll (path: /hr/payroll)
40. [Browser] Click "Run Payroll" or "Generate Payroll" for current month
41. [Browser] Select all employees or specifically "Kavita Sharma"
42. [Browser] Verify payroll components for Kavita:
    - Basic Salary: ₹25,000
    - Leave deduction if applicable (1 day absent if leave was unpaid)
43. [Browser] Click Generate / Process
44. [Verify]
    - Assert payroll generated for the month
    - Assert Kavita Sharma's payslip shows Basic ₹25,000
    - Assert PF deduction (12% of basic = ₹3,000) if PF enrolled
    - Assert ESI deduction if salary is within ESI limit

## PHASE 6: Expense Claim
45. [Browser] Navigate to Expense Claims (path: /hr/expense-claims)
46. [Browser] Click "+ New Claim"
47. [Browser] Select "Kavita Sharma" as employee
48. [Browser] Add expense: "Auto fare to bank — ₹150" — category "Travel"
49. [Browser] Add expense: "Office stationery — ₹350" — category "Office Supplies"
50. [Browser] Total = ₹500
51. [Browser] Click Submit Claim
52. [Verify] Assert claim submitted; status = Pending Approval

53. [Browser] Approve the expense claim
54. [Verify] Assert claim approved, reimbursement ₹500 noted in payroll or payment

## PHASE 7: Performance Appraisal
55. [Browser] Navigate to HR Appraisals (path: /hr/appraisals)
56. [Browser] Click "+ New Appraisal"
57. [Browser] Select "Kavita Sharma" as employee
58. [Browser] Fill "Q3 2024" in Review Period
59. [Browser] Fill rating scores: Quality 4/5, Punctuality 5/5, Teamwork 4/5
60. [Browser] Fill "Good performer, recommend increment" in Comments
61. [Browser] Click Save
62. [Verify] Assert appraisal record saved for Kavita Sharma with average rating

## PHASE 8: HR Letter Generation
63. [Browser] Navigate to HR Letters (path: /hr/letters)
64. [Browser] Click "+ Generate Letter"
65. [Browser] Select "Kavita Sharma" as employee
66. [Browser] Select "Offer Letter" or "Appointment Letter" as letter type
67. [Browser] Fill/verify the letter content is pre-populated
68. [Browser] Click Save / Issue
69. [Verify] Assert letter generated with status "Issued"

## PHASE 9: ESS (Employee Self Service)
70. [Browser] Navigate to ESS Portal (path: /ess)
71. [Verify] Assert ESS portal loads
72. [Verify]
    - Assert payslip section is accessible
    - Assert leave balance is shown
    - Assert expense claims tab is visible
