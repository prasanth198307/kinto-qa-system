# 🤖 Automated E2E Testing Examples

## Overview
This document demonstrates how to run automated end-to-end tests for critical KINTO workflows using the Playwright-based testing framework.

---

## 🎯 Critical Workflows for Automation

### Priority 1: Must Automate (Critical Path)
1. ✅ Complete 5-Stage Dispatch Workflow
2. ✅ QA Checklist Complete Flow
3. ✅ Inventory Management with Deduction
4. ✅ FIFO Payment Allocation

### Priority 2: Should Automate (Core Features)
5. ✅ PM Workflow Execution
6. ✅ GST Report Generation
7. ✅ Machine Startup Reminder

---

## 🧪 Test Example 1: Complete 5-Stage Dispatch Workflow

### Test Plan
```
1. [New Context] Create a new browser context (clean state)
2. [API] Create test finished good product in database
3. [API] Create invoice template
4. [Browser] Login as manager_test
5. [Browser] Navigate to Sales Invoices (/invoices)
6. [Browser] Click "Create Invoice" button
7. [Browser] Fill invoice form:
   - Select template
   - Customer name: XYZ Industries Test
   - Customer GSTIN: 29XYZAB5678C1D2
   - Add item: Test Product, quantity: 10, price: 5000
8. [Browser] Submit invoice
9. [Verify]
   - Invoice created with status "draft"
   - Invoice number generated (format: INV-YYYY-XXX)
   - Total amount: ₹59,000 (including GST)
10. [DB] Verify inventory has NOT changed yet
11. [Browser] Click "Generate Gatepass" button
12. [Browser] Fill gatepass form:
   - Vehicle: KA-01-TEST-1234
   - Driver: Test Driver
   - Cases: 2
   - Seals: SEAL-001, SEAL-002
13. [Browser] Submit gatepass
14. [Verify]
   - Gatepass created with status "generated"
   - Invoice status changed to "ready_for_gatepass"
15. [DB] Verify inventory DEDUCTED by 10 units
16. [Browser] Navigate to Dispatch Tracking (/dispatch-tracking)
17. [Browser] Find gatepass in table
18. [Browser] Click "Record Vehicle Exit"
19. [Browser] Confirm exit
20. [Verify]
   - Gatepass status changed to "vehicle_out"
   - Invoice status changed to "dispatched"
   - Exit timestamp recorded
21. [Browser] Click "Record POD"
22. [Browser] Draw signature on canvas (using mouse automation)
23. [Browser] Fill POD details:
   - Received by: Test Customer Rep
   - Cases: 2
   - Notes: Goods received in good condition
24. [Browser] Submit POD
25. [Verify]
   - Gatepass status changed to "delivered"
   - Invoice status changed to "delivered"
   - Signature saved (base64 format)
   - All 5 stages complete ✓
```

**Expected Duration**: 2-3 minutes  
**Critical Validations**:
- Inventory deduction at gatepass creation (NOT invoice creation)
- Status progression cannot be skipped
- Digital signature required for POD
- All 5 stages must complete in order

---

## 🧪 Test Example 2: QA Checklist Complete Flow

### Test Plan
```
1. [New Context] Create new browser context
2. [API] Create machine type and machine
3. [Browser] Login as admin_test
4. [Browser] Navigate to Checklist Templates
5. [Browser] Create template with 5 items
6. [Browser] Logout, Login as manager_test
7. [Browser] Navigate to Checklists
8. [Browser] Assign checklist to operator_test
9. [Verify]
   - Checklist created with status "assigned"
   - Operator notified (check notifications)
10. [Browser] Logout, Login as operator_test
11. [Browser] Navigate to My Checklists
12. [Browser] Open assigned checklist
13. [Browser] Fill all 5 items:
    - Item 1 (Yes/No): Select "Yes"
    - Item 2 (Number): Enter "68"
    - Item 3 (Text): Enter "Normal"
    - Item 4 (Yes/No): Select "Yes"
    - Item 5 (Number): Enter "150"
14. [Browser] Add remarks: "All checks passed"
15. [Browser] Submit for review
16. [Verify]
   - Status changed to "submitted"
   - Reviewer notified
17. [Browser] Logout, Login as reviewer_test
18. [Browser] Navigate to Pending Reviews
19. [Browser] Open submitted checklist
20. [Browser] Review all items
21. [Browser] Approve checklist
22. [Verify]
   - Status changed to "reviewed"
   - Manager notified
23. [Browser] Logout, Login as manager_test
24. [Browser] Navigate to Pending Approvals
25. [Browser] Open reviewed checklist
26. [Browser] Final approval
27. [Verify]
   - Status changed to "approved/completed"
   - Complete audit trail visible
   - All 4 roles participated ✓
```

**Expected Duration**: 3-4 minutes  
**Critical Validations**:
- All role transitions work
- Notifications sent at each stage
- Data persists across logins
- Complete workflow from build → execute → review → approve

---

## 🧪 Test Example 3: Inventory & FIFO Payment

### Test Plan
```
1. [New Context] Create new browser context
2. [API] Create test customer with 3 outstanding invoices:
   - Invoice 1: ₹29,000 (oldest)
   - Invoice 2: ₹45,000
   - Invoice 3: ₹60,000
   - Total outstanding: ₹1,34,000
3. [Browser] Login as manager_test
4. [Browser] Navigate to Customers → [Test Customer]
5. [Browser] Click "Record Payment"
6. [Browser] Enter payment amount: ₹50,000
7. [Browser] System shows FIFO allocation preview:
   - Invoice 1: ₹29,000 (fully paid)
   - Invoice 2: ₹21,000 (partial)
   - Invoice 3: ₹0 (untouched)
8. [Browser] Confirm payment
9. [Verify]
   - Invoice 1 status: "paid" ✓
   - Invoice 1 outstanding: ₹0
   - Invoice 2 status: "partially_paid"
   - Invoice 2 outstanding: ₹24,000
   - Invoice 3 status: "unpaid"
   - Invoice 3 outstanding: ₹60,000
   - Total outstanding: ₹84,000 ✓
10. [DB] Verify payment records:
    - 2 payment allocations created
    - Amounts match FIFO order
11. [Browser] Navigate to Payment Aging Report
12. [Verify]
    - Shows correct aging buckets
    - Oldest invoice paid first ✓
```

**Expected Duration**: 2 minutes  
**Critical Validations**:
- FIFO payment allocation (oldest first)
- Partial payment handling
- Payment status updates
- Aging report accuracy

---

## 🧪 Test Example 4: GST Report Generation

### Test Plan
```
1. [New Context] Create new browser context
2. [API] Create 10 test invoices:
   - 8 B2B invoices (with GSTIN)
   - 2 B2C invoices (no GSTIN)
   - Mixed CGST+SGST and IGST
   - Multiple HSN codes
3. [Browser] Login as admin_test
4. [Browser] Navigate to Reports → GST Reports
5. [Browser] Select report type: GSTR-1
6. [Browser] Select period: Current month
7. [Browser] Click "Generate Report"
8. [Verify] Report sections visible:
   - B2B section shows 8 invoices with GSTIN
   - B2C section shows aggregated 2 invoices
   - HSN summary with tax breakup
   - Total tax calculated correctly
9. [Verify] Tax calculation accuracy:
   - CGST + SGST = 18% for intra-state
   - IGST = 18% for inter-state
   - Total matches invoice totals
10. [Browser] Click "Export to Excel"
11. [Verify]
    - Excel file downloaded
    - File name format: GSTR1_MMM_YYYY.xlsx
    - Sheet contains all data
12. [Browser] Check file contents:
    - Headers match GSTIN portal format
    - All mandatory fields present
    - Data accuracy ✓
```

**Expected Duration**: 2 minutes  
**Critical Validations**:
- B2B vs B2C classification
- Tax calculation accuracy
- HSN summary
- Excel export format
- Government filing readiness

---

## 📝 How to Run Automated Tests

### Using the Testing Framework

```bash
# The system has a built-in Playwright testing framework
# Tests can be run using the run_test tool

# Example test execution command:
npx playwright test --headed dispatch-workflow.spec.ts
```

### Test Structure

Each automated test follows this pattern:

```typescript
import { test, expect } from '@playwright/test';

test.describe('5-Stage Dispatch Workflow', () => {
  test('should complete full dispatch cycle with inventory deduction', async ({ page }) => {
    // 1. Setup - Create test data via API
    const testData = await setupTestData();
    
    // 2. Login
    await page.goto('/login');
    await page.fill('[data-testid="input-username"]', 'manager_test');
    await page.fill('[data-testid="input-password"]', 'Manager@123');
    await page.click('[data-testid="button-login"]');
    
    // 3. Create Invoice (Stage 1)
    await page.goto('/invoices');
    await page.click('[data-testid="button-create-invoice"]');
    // ... fill form
    await page.click('[data-testid="button-submit"]');
    
    // 4. Verify invoice status
    await expect(page.locator('[data-testid="invoice-status"]')).toHaveText('draft');
    
    // 5. Generate Gatepass (Stage 2)
    await page.click('[data-testid="button-generate-gatepass"]');
    // ... fill form
    await page.click('[data-testid="button-submit"]');
    
    // 6. Verify inventory deduction via DB
    const inventory = await checkInventory(testData.productId);
    expect(inventory).toBe(testData.initialStock - testData.quantity);
    
    // 7. Record Vehicle Exit (Stage 3)
    // ... continue through all 5 stages
    
    // 8. Final verifications
    await expect(page.locator('[data-testid="invoice-status"]')).toHaveText('delivered');
  });
});
```

---

## 🎯 Key Test Automation Benefits

### 1. **Regression Testing**
- Run all 55 test cases in ~30 minutes
- Catch bugs before they reach production
- Verify critical workflows after every code change

### 2. **Cross-Browser Testing**
- Test on Chrome, Firefox, Safari automatically
- Mobile responsive testing
- Consistent behavior across platforms

### 3. **Data Validation**
- Verify database state after operations
- Check API responses
- Validate business logic (inventory, FIFO, GST)

### 4. **Performance Testing**
- Measure page load times
- Track API response times
- Identify bottlenecks

### 5. **CI/CD Integration**
- Run tests on every commit
- Block merges if tests fail
- Automated deployment validation

---

## 🔧 Test Data Management

### Setup Test Data
```javascript
// Create reusable test data
async function setupTestData() {
  return {
    users: {
      admin: { username: 'admin_test', password: 'Admin@123' },
      manager: { username: 'manager_test', password: 'Manager@123' },
      operator: { username: 'operator_test', password: 'Operator@123' },
      reviewer: { username: 'reviewer_test', password: 'Reviewer@123' }
    },
    products: [
      { name: 'Test Product A', price: 5000, stock: 100 },
      { name: 'Test Product B', price: 3000, stock: 50 }
    ],
    customers: [
      { name: 'XYZ Industries', gstin: '29XYZAB5678C1D2' },
      { name: 'ABC Corp', gstin: '29ABCDE1234F1Z5' }
    ]
  };
}
```

### Cleanup After Tests
```javascript
// Clean up test data after each test
async function cleanupTestData(testId) {
  // Delete test records
  await db.delete(invoices).where(eq(invoices.notes, `TEST-${testId}`));
  await db.delete(gatepasses).where(eq(gatepasses.notes, `TEST-${testId}`));
  // Reset inventory
  // etc.
}
```

---

## 📊 Test Coverage Goals

| Workflow | Manual Tests | Automated Tests | Coverage |
|----------|--------------|-----------------|----------|
| 1. QA Checklist | 5 | 2-3 | 60% |
| 2. PM | 4 | 1-2 | 50% |
| 3. Startup | 5 | 1 | 20% |
| 4. Inventory | 4 | 2-3 | 75% |
| 5. Dispatch | 5 | 1-2 | 100% ✓ |
| 6. Users | 3 | 1 | 33% |
| 7. Reports | 2 | 2 | 100% ✓ |
| 8. Notifications | 3 | 0 | 0% |
| 9. Payments | 5 | 2 | 80% ✓ |
| 10. Spare Parts | 4 | 1 | 25% |
| 11. Config | 1 | 0 | 0% |
| 12. Printing | 7 | 2 | 29% |
| 13. Alerts | 6 | 1 | 17% |
| 14. Vendors | 1 | 0 | 0% |
| 15. E2E | 1 | 1 | 100% ✓ |

**Target**: 30-40% automation coverage (critical paths fully automated)

---

## ✅ Automated Testing Checklist

Before deploying to production:

- [ ] All critical path tests passing (Workflows 1, 4, 5)
- [ ] FIFO payment allocation test passing
- [ ] GST report generation test passing
- [ ] Inventory deduction logic verified
- [ ] All 5 dispatch stages tested
- [ ] Cross-browser tests completed
- [ ] Performance benchmarks met
- [ ] No console errors during test runs
- [ ] Test data cleanup working
- [ ] CI/CD pipeline configured

---

**Automated Testing Guide v1.0**  
*Combine with manual testing for comprehensive quality assurance*
