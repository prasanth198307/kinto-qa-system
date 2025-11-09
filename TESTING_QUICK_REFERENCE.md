# 🚀 KINTO Testing Quick Reference Guide

**One-Page Cheat Sheet for Testers**

---

## 👤 Test User Credentials

```
Admin:    admin_test / Admin@123
Manager:  manager_test / Manager@123
Operator: operator_test / Operator@123
Reviewer: reviewer_test / Reviewer@123
```

---

## 🎯 Critical Test Data

### **Invoice Test Data**
```
Customer GSTIN: 29XYZAB5678C1D2
Product: Hydraulic Cylinder HC-500
Quantity: 10 units
Unit Price: ₹5,000
Total: ₹59,000 (includes GST)
```

### **Inventory Test Data**
```
Raw Material: Steel Plate 5mm
Initial Stock: 500 kg
Min Stock: 200 kg
Reorder Level: 300 kg
Issue Quantity: 100 kg
```

### **Gatepass Test Data**
```
Vehicle: KA-01-AB-1234
Driver: Suresh Kumar
Phone: +91-9876543210
Cases: 2
Seals: SEAL-001, SEAL-002
```

---

## 📋 Key Workflows Cheat Sheet

### **1. QA Checklist (5 steps)**
```
Admin → Build Template (5 items)
Manager → Assign to Operator
Operator → Execute checklist
Reviewer → Review results
Manager → Final approval
```

### **2. PM Workflow (4 steps)**
```
Admin → Create PM template
Manager → Schedule PM
Operator → Execute PM (record parts used)
Manager → Review history
```

### **3. 5-Stage Dispatch (CRITICAL)**
```
Stage 1: Invoice Created (draft) ← NO inventory change
Stage 2: Gatepass Generated (ready_for_gatepass) ← INVENTORY DEDUCTED
Stage 3: Vehicle Exit (dispatched) ← Security gate
Stage 4: POD Recorded (delivered) ← Digital signature required
Stage 5: Complete ← Payment tracking begins
```

**⚠️ KEY RULE**: Inventory deducts at Gatepass creation, NOT invoice creation!

### **4. Inventory Flow**
```
Purchase → Receive → Issue to Production → Record Production → Dispatch
```

### **5. Payment FIFO**
```
Multiple invoices → Customer pays → System applies FIFO (oldest first)
```

---

## 🔍 Common UI Elements (data-testid)

### **Buttons**
```
button-create-template
button-create-checklist
button-submit-checklist
button-review-approve
button-generate-gatepass
button-vehicle-exit
button-record-pod
button-create-invoice
button-create-pm
button-print
button-export-excel
```

### **Forms**
```
input-template-name
input-machine-type
select-checklist-type
input-quantity
input-vehicle-number
input-driver-name
select-customer
input-invoice-amount
```

---

## ✅ Quick Validation Queries

### **Check Invoice Status**
```sql
SELECT invoice_number, status, total_amount 
FROM invoices 
WHERE invoice_number = 'INV-2025-001';

Expected: status='delivered', total=59000
```

### **Check Inventory After Gatepass**
```sql
SELECT name, quantity 
FROM finished_goods 
WHERE name = 'Hydraulic Cylinder HC-500';

Expected: 65 units (75 - 10 dispatched)
```

### **Verify Gatepass Status**
```sql
SELECT gatepass_number, status, signature 
FROM gatepasses 
WHERE gatepass_number = 'GP-2025-001';

Expected: status='delivered', signature NOT NULL
```

### **Check Payment FIFO**
```sql
SELECT invoice_number, amount_paid, amount_due 
FROM invoices 
WHERE customer_id = [customer_id]
ORDER BY invoice_date;

Expected: Oldest invoices paid first
```

---

## 🐛 Common Issues & Solutions

### **Issue 1: Cannot create gatepass**
```
Error: "Invoice ID required"
Solution: MUST create invoice first, then generate gatepass from invoice
```

### **Issue 2: Inventory not deducting**
```
Problem: Created invoice, but stock still same
Solution: CORRECT - stock deducts when gatepass is created, NOT invoice
```

### **Issue 3: Signature validation fails**
```
Error: "Invalid signature"
Solution: Draw a proper signature (must be > 100 chars base64)
```

### **Issue 4: Cannot record vehicle exit**
```
Error: "Invalid status"
Solution: Must be in "generated" status, cannot skip stages
```

### **Issue 5: FIFO not working**
```
Problem: Payment not applying to oldest invoice
Solution: Check invoice dates, system auto-applies FIFO
```

---

## 🎯 Priority Testing Order

### **P0 - MUST TEST FIRST** (Critical Path)
1. ✅ QA Checklist workflow (TC-001-*)
2. ✅ Inventory Management (TC-004-*)
3. ✅ Sales & Dispatch 5-stage (TC-005-*)
4. ✅ E2E Integration Test (TC-015-01)

### **P1 - TEST NEXT** (Core Features)
5. ✅ PM Workflow (TC-002-*)
6. ✅ Payment FIFO (TC-009-02)
7. ✅ GST Reports (TC-007-02)
8. ✅ Machine Startup (TC-003-*)

### **P2 - TEST AFTER P0/P1** (Supporting Features)
9. ✅ Printing (TC-012-*)
10. ✅ Alerts (TC-013-*)
11. ✅ User Management (TC-006-*)
12. ✅ Reporting (TC-007-01)

---

## 📊 Status Reference

### **Invoice Statuses**
```
draft → ready_for_gatepass → dispatched → delivered
```

### **Gatepass Statuses**
```
generated → vehicle_out → delivered → completed
```

### **Checklist Statuses**
```
assigned → in_progress → submitted → reviewed → approved
```

### **PM Statuses**
```
scheduled → in_progress → completed
```

---

## 🔔 Expected Notifications

### **WhatsApp Notifications**
- Checklist assigned → Operator
- Checklist overdue → Operator + Manager
- Low stock → Manager
- PM overdue → Operator + Manager
- Payment overdue → Manager
- Machine startup reminder → Operator

### **Email Notifications**
- All WhatsApp triggers also send email
- Invoice created → Customer
- Gatepass created → Customer
- Payment received → Customer

---

## 🖨️ Printable Documents

### **Can Print From Multiple Screens**
```
Invoice:
  - Invoice Detail Page (primary)
  - Invoice Table (quick print)
  - Gatepass Table (linked invoice)
  - Dispatch Tracking (invoice tab)

Gatepass:
  - Gatepass Detail Page
  - Dispatch Tracking

Reports:
  - Sales Dashboard
  - GST Reports (GSTR-1, GSTR-3B)
  - Payment Register
  - PM Execution Report
  - Raw Material Issuance
```

---

## ⚡ Quick Test Case Lookup

| Workflow | # Cases | Key Tests |
|----------|---------|-----------|
| 1. QA Checklist | 5 | Build→Assign→Execute→Review→Approve |
| 2. PM | 4 | Template→Schedule→Execute→History |
| 3. Startup | 5 | Configure→Schedule→Execute→Monitor→Alert |
| 4. Inventory | 4 | Add→Issue→Produce→Purchase |
| 5. Dispatch | 5 | Invoice→Gatepass→Exit→POD→Complete |
| 6. Users | 3 | Create→Configure→Deactivate |
| 7. Reports | 2 | Sales Dashboard + GST |
| 8. Notifications | 3 | Detect→Complete→Review |
| 9. Payments | 5 | Partial→FIFO→Aging→Reminder→Export |
| 10. Spare Parts | 4 | Add→Use→Purchase→Receive |
| 11. Config | 1 | Notification Settings |
| 12. Printing | 7 | All printable docs |
| 13. Alerts | 6 | Stock→PM→Payment→Dashboard |
| 14. Vendors | 1 | Vendor Master |
| 15. E2E | 1 | Complete cycle |

**Total: 55 test cases**

---

## 🚨 Red Flags (Stop Testing If You See These)

### **CRITICAL - Escalate Immediately**
- ❌ System crash or white screen of death
- ❌ Data loss (records disappearing)
- ❌ Cannot login with any test account
- ❌ Inventory going negative
- ❌ Duplicate invoice/gatepass numbers
- ❌ Payment amounts not matching invoices

### **HIGH - Report Same Day**
- ⚠️ Workflow stuck (cannot proceed to next stage)
- ⚠️ Validation not working (can bypass required fields)
- ⚠️ Status transition violation (can skip stages)
- ⚠️ Incorrect GST calculations
- ⚠️ FIFO not applying correctly

---

## 📝 Bug Reporting Quick Template

```
BUG-[XXX]: [One-line description]
TC: TC-XXX-XX | Severity: Critical/High/Medium/Low
Steps: 1. [Step] 2. [Step] 3. [Step]
Expected: [What should happen]
Actual: [What happened]
Screenshot: [Attach]
```

---

## ⏱️ Estimated Test Times

| Workflow | Time | Notes |
|----------|------|-------|
| QA Checklist | 4 hrs | Sequential execution |
| PM | 3.75 hrs | Depends on spare parts |
| Startup | 3 hrs | Test reminder timing |
| Inventory | 4 hrs | Foundation for others |
| Dispatch | 5.25 hrs | Most complex |
| Payments | 4 hrs | FIFO testing crucial |
| Printing | 2.25 hrs | Quick validation |
| E2E Integration | 3 hrs | All testers together |

**Total: ~40 hours with 4 testers = 5 days**

---

## 🎯 Daily Goals

### **Day 1**: Environment + QA + Inventory
### **Day 2**: Complete Dispatch (5-stage)
### **Day 3**: PM + Startup + Spare Parts
### **Day 4**: Payments + Users + Alerts
### **Day 5**: Reports + Printing + E2E

---

## 📞 Who to Contact

```
Test Lead: [Name] - Overall coordination
Admin Tester: Tester A - System config
Manager Tester: Tester B - Workflows
Operator Tester: Tester C - Execution
Reviewer Tester: Tester D - Quality review
```

---

## ✅ Before You Start Testing

- [ ] Read DETAILED_TEST_GUIDE.md for your assigned test cases
- [ ] Create all 4 test user accounts
- [ ] Clear browser cache
- [ ] Open browser console (F12)
- [ ] Have bug template ready
- [ ] Know your daily test assignment
- [ ] Understand dependencies (some tests require others first)

---

## 📱 Keyboard Shortcuts

```
F12 - Open browser console (for debugging)
Ctrl+P - Print
Ctrl+F - Search on page
Ctrl+Shift+I - Inspect element
F5 - Refresh page
Ctrl+Shift+Delete - Clear cache
```

---

## 🎓 Testing Best Practices

1. ✅ **Follow exact steps** - Don't deviate from test case
2. ✅ **Verify after each step** - Check expected result
3. ✅ **Take screenshots** - Especially for bugs
4. ✅ **Check console** - Look for JS errors
5. ✅ **Validate database** - Run SQL queries
6. ✅ **Test edge cases** - Try invalid inputs
7. ✅ **Document everything** - Write down observations
8. ✅ **Ask for help** - If stuck > 15 mins, escalate

---

## 🔑 Key Success Criteria

### **For Production Go-Live:**
- ✅ All 55 test cases executed (100%)
- ✅ All 18 critical path tests PASSED
- ✅ Zero critical/high bugs open
- ✅ E2E integration test PASSED
- ✅ GST reports accurate
- ✅ FIFO payment allocation working
- ✅ Inventory deduction at gatepass ✓

---

**Quick Reference v1.0 - Print and Keep Handy!**  
*One page to rule them all* 🎯
