# KINTO Operations & QA Management System - Test Cases

## Version: 1.0
## Date: November 12, 2025

---

## 1. AUTHENTICATION & SESSION MANAGEMENT

### TC-AUTH-001: User Login with Valid Credentials
**Priority:** Critical  
**Preconditions:** User exists in database  
**Steps:**
1. Navigate to login page
2. Enter valid username: "admin"
3. Enter valid password: "password"
4. Click "Login" button

**Expected Results:**
- User is redirected to Admin Dashboard
- Session cookie is set (connect.sid)
- User remains logged in after page refresh
- All API requests include authentication cookie

**Test Data:**
- Username: admin
- Password: password

---

### TC-AUTH-002: User Login with Invalid Credentials
**Priority:** High  
**Steps:**
1. Navigate to login page
2. Enter username: "admin"
3. Enter incorrect password: "wrongpassword"
4. Click "Login" button

**Expected Results:**
- Error message displayed: "Invalid credentials"
- User remains on login page
- No session cookie is set

---

### TC-AUTH-003: Session Persistence
**Priority:** High  
**Preconditions:** User is logged in  
**Steps:**
1. Log in successfully
2. Navigate to different screens
3. Refresh browser (F5)
4. Wait 5 minutes
5. Navigate to another screen

**Expected Results:**
- User remains authenticated across page refreshes
- Session persists for configured duration (7 days)
- All API requests continue to work without re-authentication

---

## 2. PRODUCT MASTER MANAGEMENT

### TC-PROD-001: Create New Product with BOM
**Priority:** Critical  
**Preconditions:** User logged in as Admin, Raw materials exist  
**Steps:**
1. Navigate to Admin → Production → Products
2. Click "Add Product" button
3. **Product Info Tab:**
   - Enter Product Code: "TEST-PROD-001"
   - Enter Product Name: "Test Product 1L"
   - Select Category: "Beverages"
   - Enter Description: "Test product description"
4. **Packaging Tab:**
   - Enter Base Unit: "Bottle"
   - Enter Derived Unit: "Case"
   - Select Conversion Method: "Direct Value"
   - Enter Derived Value Per Base: 24
5. **Pricing/Tax Tab:**
   - Enter Base Price: 50.00
   - Enter GST Percent: 18
   - Enter HSN Code: "2201"
   - Select Tax Type: "GST"
6. **BOM Tab:**
   - Click "Add Row"
   - Select Raw Material: "Preform 21g Transparent"
   - Enter Quantity Required: 1
   - Enter UOM: "Piece"
   - Enter Notes: "Main body material"
7. Click "Save"

**Expected Results:**
- Product is created successfully
- Success toast message appears
- Product appears in products list
- All 4 tabs are clickable and functional
- BOM items are saved and retrievable
- Product can be edited and all data persists

**Test Data:**
- Product Code: TEST-PROD-001
- Base Price: 50.00
- GST: 18%
- BOM Item: Preform 21g, Qty: 1

---

### TC-PROD-002: Edit Existing Product
**Priority:** High  
**Preconditions:** Product exists  
**Steps:**
1. Navigate to Products page
2. Click "Edit" icon on existing product
3. Switch to "Pricing/Tax" tab
4. Update Base Price to 55.00
5. Switch to "BOM" tab
6. Update quantity of existing BOM item to 2
7. Click "Save"

**Expected Results:**
- Product updates successfully
- Price change is reflected immediately
- BOM quantity is updated
- Edit history is maintained (if audit logging enabled)

---

### TC-PROD-003: Navigate Between Product Tabs
**Priority:** Critical  
**Preconditions:** Product form is open  
**Steps:**
1. Click "Add Product" or edit existing product
2. Click "Product Info" tab → verify content loads
3. Click "Packaging" tab → verify content loads
4. Click "Pricing/Tax" tab → verify content loads
5. Click "BOM" tab → verify content loads
6. Switch back to "Product Info" tab

**Expected Results:**
- All tabs are clickable
- Tab content switches instantly
- No JavaScript errors in console
- Form data persists when switching tabs
- Active tab is visually highlighted

---

## 3. RAW MATERIAL MASTER MANAGEMENT

### TC-RAW-001: Create Raw Material with Type Master Auto-Fetch
**Priority:** Critical  
**Preconditions:** Raw Material Types exist in system  
**Steps:**
1. Navigate to Admin → Production → Raw Materials
2. Click "Add Raw Material"
3. Enter Material Name: "Preform 21g Transparent"
4. Select Material Type: "Preform" (from Type Master dropdown)
5. **Verify Type Details Auto-Populate:**
   - Base Unit displays
   - Usable Units displays
   - Conversion Method displays
   - Loss % displays
6. Select Category: "Preform"
7. Enter Description: "21g transparent preform"
8. **Stock Management Section:**
   - Toggle "Opening Stock Only" ON
   - Enter Opening Stock: 100
   - Select Opening Date: Today's date
9. Click "Save"

**Expected Results:**
- Type Master details auto-fetch and display correctly
- Material is created successfully
- Opening Stock is set correctly
- Closing Stock = Opening Stock (since in "Opening Stock Only" mode)
- Closing Stock Usable is calculated: Opening × Usable Units

**Test Data:**
- Material Name: Preform 21g Transparent
- Material Type: Preform
- Opening Stock: 100
- Stock Mode: Opening Stock Only

---

### TC-RAW-002: Create Raw Material with Ongoing Inventory Mode
**Priority:** High  
**Preconditions:** Raw Material Types exist  
**Steps:**
1. Navigate to Raw Materials
2. Click "Add Raw Material"
3. Enter Material Name: "Cap 28mm White"
4. Select Material Type: "Cap"
5. **Stock Management Section:**
   - Toggle "Opening Stock Only" OFF (Ongoing Inventory mode)
   - Enter Opening Stock: 500
   - Enter Received Quantity: 200
   - Enter Returned Quantity: 50
   - Enter Adjustments: -10
6. Click "Save"

**Expected Results:**
- Material created successfully
- Closing Stock calculated: 500 + 200 - 50 - 10 = 640
- Closing Stock Usable calculated: 640 × Usable Units
- Stock mode is "Ongoing Inventory"

**Test Data:**
- Opening: 500, Received: 200, Returned: 50, Adjustments: -10
- Expected Closing Stock: 640

---

### TC-RAW-003: Type Master Auto-Fetch Verification
**Priority:** High  
**Steps:**
1. Open Raw Material form
2. Select Material Type: "Preform"
3. Verify displayed values match Type Master

**Expected Results:**
- Base Unit displays correctly (e.g., "Bag")
- Usable Units displays correctly (e.g., "1166 pcs per bag")
- Conversion Method displays correctly (e.g., "formula-based")
- Loss % displays correctly (e.g., "2%")
- All values are read-only (auto-fetched, not editable)

---

## 4. BOM-DRIVEN RAW MATERIAL ISSUANCE

### TC-ISSUE-001: Auto-Populate BOM Materials for Product
**Priority:** Critical  
**Preconditions:** Product with BOM exists  
**Steps:**
1. Navigate to Production → Issue Raw Material
2. Select Date: Today
3. Select Product: "Test Product 1L" (has BOM)
4. Enter Issued To: "Machine Operator 1"
5. Enter Shift: "Day"
6. Verify BOM items auto-populate in Items section

**Expected Results:**
- All BOM items for selected product auto-populate
- Quantities are pre-filled from BOM
- UOMs are pre-filled correctly
- User can modify quantities before issuing
- Multiple raw materials display correctly

---

## 5. PRODUCTION ENTRY WITH VARIANCE ANALYSIS

### TC-PROD-ENTRY-001: Create Production Entry
**Priority:** Critical  
**Preconditions:** Raw material issuance exists  
**Steps:**
1. Navigate to Production → Production Entries
2. Click "Add Production Entry"
3. Select Date: Today
4. Select Product: Product from issuance
5. Select Shift: Same as issuance
6. Link to Raw Material Issuance
7. Enter Actual Produced Quantity: 1000
8. Enter Expected Quantity: 1100
9. Enter Remarks: "Slight variance due to machine adjustment"
10. Click "Save"

**Expected Results:**
- Production entry created successfully
- Variance calculated: (1000 - 1100) / 1100 = -9.09%
- Variance displayed in red (negative variance)
- Finished goods created with 'pending' quality status
- Inventory NOT updated until quality approval

---

## 6. PRODUCTION RECONCILIATION

### TC-RECON-001: Complete Production Reconciliation
**Priority:** Critical  
**Preconditions:** Production entry and raw material issuance exist  
**Steps:**
1. Navigate to Production Operations → Production Reconciliation
2. Click "Add Reconciliation"
3. Select Date: Today
4. Select Shift: "Day"
5. Select Product
6. Link Raw Material Issuance
7. Link Production Entry
8. Verify itemized breakdown displays
9. Review variance percentages
10. Enter Returned Materials (if any)
11. Click "Save"

**Expected Results:**
- Reconciliation created successfully
- Net consumed calculated dynamically
- Variance % calculated for each material
- Returned materials update inventory
- Audit trail created
- Data integrity enforced via composite unique index

---

## 7. SALES RETURNS & CREDIT NOTES

### TC-RETURN-001: Process Sales Return
**Priority:** High  
**Preconditions:** Invoice exists  
**Steps:**
1. Navigate to Finance → Sales Returns
2. Click "Add Sales Return"
3. Select Invoice
4. Enter Return Date: Today
5. Select Return Type: "Damaged"
6. Add returned items with quantities
7. Enter Reason: "Damaged during transit"
8. Click "Save"

**Expected Results:**
- Sales return created
- Status: "Quality Segregation Pending"
- Items move to quality check
- Inventory not updated until quality segregation complete

---

### TC-RETURN-002: Auto-Generate Credit Note (Same Month)
**Priority:** High  
**Preconditions:** Sales return quality segregation complete, same month as invoice  
**Steps:**
1. Complete quality segregation for same-month return
2. Verify credit note auto-generated
3. Check credit note details

**Expected Results:**
- Credit note auto-generated
- GST calculations correct
- Line items match returned items
- Credit amount calculated correctly
- Status: "Approved"

---

## 8. INVOICE & GATEPASS WORKFLOW

### TC-INVOICE-001: Create Invoice with Gatepass
**Priority:** Critical  
**Preconditions:** Finished goods with approved quality status exist  
**Steps:**
1. Navigate to Finance → Invoices
2. Click "Create Invoice"
3. Enter invoice details
4. Add finished goods items
5. Calculate GST amounts
6. Save invoice
7. Navigate to Operations → Gatepasses
8. Create gatepass linked to invoice

**Expected Results:**
- Invoice created successfully
- GST calculated correctly
- Gatepass can only be created for invoiced items
- Inventory deducted on gatepass creation
- Dispatch workflow initiated

---

## 9. ROLE-BASED PERMISSIONS

### TC-PERM-001: Admin Access to All Screens
**Priority:** High  
**Preconditions:** Logged in as Admin  
**Steps:**
1. Verify access to all 36 admin screens
2. Verify all CRUD operations allowed

**Expected Results:**
- All 36 screens accessible
- All operations (Create, Read, Update, Delete) allowed
- No "Access Denied" errors

---

### TC-PERM-002: Operator Limited Access
**Priority:** High  
**Preconditions:** Logged in as Operator  
**Steps:**
1. Attempt to access Admin screens
2. Attempt to access Finance screens

**Expected Results:**
- "Access Denied" message for restricted screens
- Only allowed screens accessible
- Read-only access where configured

---

## 10. VARIANCE ANALYTICS DASHBOARD

### TC-ANALYTICS-001: View Variance Trends
**Priority:** Medium  
**Preconditions:** Production reconciliation data exists  
**Steps:**
1. Navigate to Production Operations → Variance Analytics
2. Select date range: Last 30 days
3. View variance trends chart
4. Check key metrics
5. Filter by product

**Expected Results:**
- Variance trends display correctly
- Key metrics calculated accurately
- Color-coded indicators (green/red) work
- Charts render without errors
- Excel export works
- PDF export works

---

## 11. PENDING PAYMENTS TRACKING

### TC-PAYMENT-001: View Pending Payments
**Priority:** High  
**Steps:**
1. Navigate to Finance → Pending Payments
2. View invoice-wise outstanding balances
3. Check payment history
4. Verify overdue indicators

**Expected Results:**
- Outstanding amounts display correctly
- Paid amounts match payment records
- Overdue invoices highlighted
- Total outstanding calculated correctly

---

## 12. CROSS-BROWSER & MOBILE TESTING

### TC-BROWSER-001: Chrome Desktop
**Priority:** High  
**Test all critical workflows in Chrome**

### TC-BROWSER-002: Firefox Desktop
**Priority:** Medium  
**Test all critical workflows in Firefox**

### TC-BROWSER-003: Safari Desktop
**Priority:** Medium  
**Test all critical workflows in Safari**

### TC-BROWSER-004: Mobile Responsive
**Priority:** High  
**Steps:**
1. Open app on mobile device or use Chrome DevTools
2. Test navigation
3. Test forms
4. Test tabs

**Expected Results:**
- UI adapts to mobile screen
- Tabs work on touch devices
- Forms are usable
- Navigation accessible

---

## 13. PERFORMANCE TESTING

### TC-PERF-001: Page Load Time
**Priority:** Medium  
**Expected:** Dashboard loads in < 3 seconds

### TC-PERF-002: Large Dataset Handling
**Priority:** Medium  
**Test:** Load products list with 1000+ items

**Expected Results:**
- Pagination works smoothly
- No browser freezing
- Search/filter responsive

---

## 14. DATA INTEGRITY

### TC-DATA-001: Inventory Reconciliation
**Priority:** Critical  
**Steps:**
1. Track inventory through full cycle:
   - Raw material opening stock
   - Issuance for production
   - Production entry
   - Finished goods creation
   - Invoice & gatepass
   - Inventory deduction
2. Verify quantities match at each step

**Expected Results:**
- All quantities reconcile correctly
- No inventory leakage
- Audit trail complete

---

## Test Execution Summary Template

| Test Case ID | Description | Status | Priority | Date Tested | Tester | Notes |
|--------------|-------------|--------|----------|-------------|--------|-------|
| TC-AUTH-001 | User Login | PASS | Critical | 2025-11-12 | | |
| TC-PROD-001 | Create Product with BOM | PASS | Critical | 2025-11-12 | | |
| TC-PROD-003 | Product Tabs Navigation | PASS | Critical | 2025-11-12 | | Tabs working after fix |
| TC-RAW-001 | Raw Material with Auto-Fetch | PASS | Critical | 2025-11-12 | | Type Master auto-fetch working |

---

## Bug Tracking Template

| Bug ID | Test Case | Description | Severity | Status | Fix Date |
|--------|-----------|-------------|----------|--------|----------|
| BUG-001 | TC-PROD-003 | Product tabs not clickable | Critical | FIXED | 2025-11-12 |
| BUG-002 | TC-AUTH-001 | Session cookies not persisting | Critical | FIXED | 2025-11-12 |
| BUG-003 | TC-RETURN-002 | Missing approved_by column in credit_notes | High | FIXED | 2025-11-12 |

---

## Automation Candidates

High-priority test cases suitable for automated testing with Playwright:
1. TC-AUTH-001 - User Login
2. TC-PROD-003 - Product Tabs Navigation
3. TC-RAW-001 - Raw Material Creation
4. TC-INVOICE-001 - Invoice Creation Flow
5. TC-RECON-001 - Production Reconciliation

---

## Test Environment Requirements

- **Browser:** Chrome 120+, Firefox 115+, Safari 16+
- **Database:** PostgreSQL 14+ with test data
- **Users:** Admin, Manager, Operator, Quality roles
- **Data:** Minimum 10 products, 20 raw materials, 5 invoices
- **Network:** Stable connection for API calls

---

## Sign-Off

**Prepared by:** [Name]  
**Date:** November 12, 2025  
**Version:** 1.0  
**Approved by:** [Name]  
**Date:** [Date]
