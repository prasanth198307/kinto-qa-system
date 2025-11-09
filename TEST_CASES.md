# KINTO Operations & QA Management System - Test Cases

## Role-Based Test Cases

### Roles Overview
- **Admin**: System configuration, builds templates, final approvals
- **Manager**: Assignment, scheduling, approvals, oversight
- **Operator**: Data entry, execution, submissions
- **Reviewer**: Quality checks, reviews, verification

---

## 1. QA Checklist Workflow

### Test Case 1.1: Admin Builds Checklist Template
**Role**: Admin  
**Objective**: Create a new checklist template for daily quality checks

**Steps**:
1. Login as Admin
2. Navigate to: Admin Dashboard → Checklist Templates
3. Click "Create Template" button
4. Fill in template details:
   - Template Name: "Daily Quality Inspection - Machine A"
   - Description: "Daily morning inspection checklist"
5. Add checklist items:
   - Item 1: "Check oil level" - Yes/No
   - Item 2: "Check temperature gauge" - Numeric value
   - Item 3: "Visual inspection for leaks" - Yes/No
   - Item 4: "Safety guards in place" - Yes/No
6. Click "Save Template"
7. **Expected Result**: Template created successfully, visible in template list

---

### Test Case 1.2: Manager Assigns Checklist to Operator
**Role**: Manager  
**Objective**: Assign daily checklist to an operator for execution

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Checklists
3. Click "Assign New Checklist" button
4. Select:
   - Template: "Daily Quality Inspection - Machine A"
   - Machine: "CNC Machine 001"
   - Assigned To: Operator (select from dropdown)
   - Due Date: Today's date
   - Shift: "Morning Shift"
5. Click "Assign Checklist"
6. **Expected Result**: Checklist assigned, operator receives notification

---

### Test Case 1.3: Operator Executes Checklist
**Role**: Operator  
**Objective**: Complete assigned checklist and submit for review

**Steps**:
1. Login as Operator
2. Navigate to: Operator Dashboard → My Assigned Checklists
3. See assigned checklist: "Daily Quality Inspection - Machine A"
4. Click "Start Checklist"
5. Fill in all checklist items:
   - Oil level: Yes
   - Temperature: 75°C
   - Visual inspection: No issues found
   - Safety guards: Yes
6. Add remarks: "All parameters within normal range"
7. Click "Submit for Review"
8. **Expected Result**: Checklist submitted, status changes to "Pending Review", reviewer notified

---

### Test Case 1.4: Reviewer Checks Submitted Checklist
**Role**: Reviewer  
**Objective**: Review operator's checklist submission and verify data

**Steps**:
1. Login as Reviewer
2. Navigate to: Reviewer Dashboard → Pending Reviews
3. See checklist: "Daily Quality Inspection - Machine A"
4. Click "Review" button
5. Verify all checklist items:
   - Check if all fields are filled
   - Verify values are within acceptable range
   - Review operator remarks
6. Add review comments: "Verified. All parameters normal."
7. Click "Approve & Send to Manager"
8. **Expected Result**: Checklist status changes to "Reviewed", manager notified

---

### Test Case 1.5: Manager Final Approval
**Role**: Manager  
**Objective**: Provide final approval on reviewed checklist

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Awaiting Final Approval
3. See checklist: "Daily Quality Inspection - Machine A"
4. Click "Review" button
5. Review:
   - Operator's entries
   - Reviewer's comments
   - Overall checklist quality
6. Click "Final Approve"
7. **Expected Result**: Checklist marked as "Completed", workflow closed

---

## 2. Preventive Maintenance (PM) Workflow

### Test Case 2.1: Admin Creates PM Template
**Role**: Admin  
**Objective**: Create preventive maintenance task template

**Steps**:
1. Login as Admin
2. Navigate to: Admin Dashboard → PM Templates
3. Click "Create PM Template"
4. Fill in details:
   - Template Name: "Monthly Hydraulic System Check"
   - Category: "Hydraulic Maintenance"
   - Estimated Duration: 2 hours
5. Add task items:
   - "Check hydraulic fluid level"
   - "Inspect hoses for wear"
   - "Test pressure gauge"
   - "Clean filters"
6. Click "Save Template"
7. **Expected Result**: PM template created and available for scheduling

---

### Test Case 2.2: Manager Schedules PM Plan
**Role**: Manager  
**Objective**: Schedule recurring preventive maintenance

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Maintenance Plans
3. Click "Schedule PM"
4. Fill in:
   - Template: "Monthly Hydraulic System Check"
   - Machine: "Hydraulic Press 01"
   - Frequency: Monthly
   - Start Date: 1st of next month
   - Assigned To: Maintenance Operator
5. Click "Schedule"
6. **Expected Result**: PM plan created, recurring schedule set, operator notified

---

### Test Case 2.3: Operator Executes PM Tasks
**Role**: Operator  
**Objective**: Execute scheduled PM and record results

**Steps**:
1. Login as Operator
2. Navigate to: Operator Dashboard → PM Execution
3. See scheduled PM: "Monthly Hydraulic System Check"
4. Click "Start Execution"
5. Complete each task:
   - Hydraulic fluid level: ✓ Checked, level normal
   - Hoses inspection: ✓ No wear detected
   - Pressure gauge: ✓ Reading 2500 PSI (normal)
   - Filters cleaned: ✓ Completed
6. Record spare parts used (if any)
7. Add execution notes
8. Click "Complete PM"
9. **Expected Result**: PM marked complete, recorded in PM History, manager notified

---

### Test Case 2.4: Manager Reviews PM History
**Role**: Manager  
**Objective**: Review completed maintenance history

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → PM History
3. Filter by:
   - Machine: "Hydraulic Press 01"
   - Date Range: Last month
4. View execution details
5. Verify compliance with schedule
6. **Expected Result**: Can view all PM history, completion rates, trends

---

## 3. Machine Startup Reminder Workflow

### Test Case 3.1: Admin Configures Machine Startup Tasks
**Role**: Admin  
**Objective**: Set up machine startup checklist and reminder schedule

**Steps**:
1. Login as Admin
2. Navigate to: Admin Dashboard → Machines
3. Select a machine: "CNC Machine 001"
4. Click "Configure Startup Tasks"
5. Add startup tasks:
   - Task 1: "Power on main unit"
   - Task 2: "Check coolant level"
   - Task 3: "Warm up spindle (10 mins)"
   - Task 4: "Calibrate zero position"
   - Task 5: "Run test program"
6. Set reminder timing: "2 hours before scheduled production"
7. Click "Save Configuration"
8. **Expected Result**: Startup tasks configured, ready for scheduling

---

### Test Case 3.2: Manager Schedules Production with Startup Reminder
**Role**: Manager  
**Objective**: Schedule production and trigger automatic startup reminders

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Production Schedule
3. Click "Schedule Production"
4. Fill in:
   - Machine: "CNC Machine 001"
   - Production Date: Tomorrow
   - Start Time: 08:00 AM
   - Operator: John Smith
   - Job: "Production Run #123"
5. Check: "Send startup reminder" ✓
6. Click "Schedule"
7. **Expected Result**: 
   - Production scheduled
   - System will send reminder to operator 2 hours before (6:00 AM)
   - Reminder includes startup task list

---

### Test Case 3.3: Operator Receives and Completes Startup Tasks
**Role**: Operator  
**Objective**: Receive reminder and complete machine startup

**Steps**:
1. **At 6:00 AM** - Operator receives:
   - WhatsApp notification: "Machine startup in 2 hours - CNC Machine 001"
   - Email notification with startup task list
2. Login as Operator
3. Navigate to: Operator Dashboard → Machine Startup
4. See reminder: "CNC Machine 001 - Production at 8:00 AM"
5. Click "Start Machine Startup"
6. Complete each task:
   - ✓ Power on main unit - Completed
   - ✓ Check coolant level - Level OK
   - ✓ Warm up spindle - 10 mins completed
   - ✓ Calibrate zero position - Calibrated
   - ✓ Run test program - Test passed
7. Add notes: "Machine ready for production"
8. Click "Mark Startup Complete"
9. **Expected Result**: 
   - Startup marked complete
   - Machine status changed to "Ready"
   - Manager notified that machine is ready

---

### Test Case 3.4: Manager Monitors Startup Completion
**Role**: Manager  
**Objective**: Verify machine startup completed on time

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Machine Status
3. View machine status:
   - CNC Machine 001: "Ready" ✓
   - Startup completed: 7:45 AM
   - Completed by: John Smith
4. View startup task completion details
5. **Expected Result**: Can track which machines are ready for production

---

### Test Case 3.5: System Sends Overdue Notification (Missed Startup)
**Role**: System (Automatic)  
**Objective**: Alert if operator misses machine startup

**Scenario**: Operator doesn't complete startup by scheduled time

**Steps**:
1. Production scheduled for 8:00 AM
2. Reminder sent at 6:00 AM
3. **At 8:00 AM** - Startup still not completed
4. System automatically sends:
   - WhatsApp alert to Operator: "URGENT: Machine startup overdue"
   - Email alert to Manager: "CNC Machine 001 startup not completed"
   - Dashboard notification
5. Manager can see:
   - Machine status: "Not Ready" ⚠️
   - Production delayed
6. **Expected Result**: Escalation alerts sent, manager can take action

---

## 4. Inventory Management Workflow

### Test Case 4.1: Admin Configures Inventory Items
**Role**: Admin  
**Objective**: Set up raw materials and products in system

**Steps**:
1. Login as Admin
2. Navigate to: Admin Dashboard → Raw Materials
3. Click "Add Raw Material"
4. Fill in:
   - Material Name: "Steel Plate 5mm"
   - SKU: "STL-PLT-5MM"
   - UOM: "kg"
   - Minimum Stock: 500 kg
   - Reorder Level: 200 kg
5. Click "Save"
6. Repeat for multiple materials
7. **Expected Result**: Materials added to inventory system

---

### Test Case 4.2: Manager Issues Raw Material to Production
**Role**: Manager  
**Objective**: Issue raw material for production use

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Inventory Management → Raw Materials
3. Click "Issue Material" button
4. Fill in:
   - Material: "Steel Plate 5mm"
   - Quantity: 100 kg
   - Issued To: Production Line 1
   - Purpose: "Job Order #1234"
   - Date: Today
5. Click "Issue Material"
6. **Expected Result**: Inventory deducted, transaction recorded, stock level updated

---

### Test Case 4.3: Operator Records Finished Goods Production
**Role**: Operator  
**Objective**: Record completed production output

**Steps**:
1. Login as Operator
2. Navigate to: Operator Dashboard → Finished Goods
3. Click "Add Production"
4. Fill in:
   - Product: "Widget A"
   - Quantity Produced: 50 units
   - Production Date: Today
   - Batch Number: "BATCH-001"
   - Quality Status: "Passed"
5. Click "Save Production"
6. **Expected Result**: Finished goods inventory increased, available for sale

---

### Test Case 4.4: Manager Creates Purchase Order
**Role**: Manager  
**Objective**: Replenish low stock items by creating PO

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Purchase Orders
3. Click "Create Purchase Order"
4. Fill in:
   - Vendor: "ABC Steel Suppliers"
   - PO Date: Today
   - Expected Delivery: +7 days
5. Add line items:
   - Material: "Steel Plate 5mm"
   - Quantity: 1000 kg
   - Rate: ₹50/kg
   - Amount: ₹50,000
6. Add taxes (GST 18%)
7. Click "Create PO"
8. **Expected Result**: PO created, vendor notified, tracking started

---

## 5. Sales & Dispatch Workflow

### Test Case 5.1: Admin Creates Invoice Template
**Role**: Admin  
**Objective**: Set up company invoice template

**Steps**:
1. Login as Admin
2. Navigate to: Admin Dashboard → Invoice Templates
3. Click "Create Template"
4. Fill in:
   - Template Name: "Standard GST Invoice"
   - Company Name: "KINTO Manufacturing Ltd."
   - GSTIN: "29ABCDE1234F1Z5"
   - Address, Phone, Email
   - Bank Account Details
   - Terms & Conditions
5. Upload company logo
6. Click "Save Template"
7. **Expected Result**: Template available for invoice creation

---

### Test Case 5.2: Manager Creates Sales Invoice
**Role**: Manager  
**Objective**: Generate invoice for customer order

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Sales Invoices
3. Click "Create Invoice"
4. Select Template: "Standard GST Invoice"
5. Fill in:
   - Invoice Date: Today
   - Customer: "XYZ Industries"
   - Customer GSTIN: "29XYZAB5678C1D2"
   - Billing Address
   - Shipping Address
6. Add items:
   - Product: "Widget A"
   - Quantity: 50 units
   - Rate: ₹1,000/unit
   - HSN Code: 8481
   - GST: 18%
7. System calculates:
   - Subtotal: ₹50,000
   - CGST 9%: ₹4,500
   - SGST 9%: ₹4,500
   - **Total: ₹59,000**
8. Click "Save Invoice"
9. **Expected Result**: Invoice created with status "Draft", invoice number assigned

---

### Test Case 5.3: Manager Generates Gatepass from Invoice
**Role**: Manager  
**Objective**: Create gatepass for material dispatch

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Dispatch Tracking → Invoices tab
3. Find invoice for "XYZ Industries"
4. Click "Generate Gatepass" button
5. System auto-fills:
   - Invoice details
   - Items from invoice
   - Customer information
6. Add dispatch details:
   - Vehicle Number: "MH-01-AB-1234"
   - Driver Name: "Ramesh Kumar"
   - Driver Phone: "9876543210"
   - Number of Cases: 5
   - Seal Numbers: "SEAL001, SEAL002"
7. Click "Create Gatepass"
8. **Expected Result**: 
   - Gatepass created (status: "Generated")
   - Invoice status → "Ready for Dispatch"
   - **Inventory deducted** (50 units of Widget A)
   - Gatepass number assigned

---

### Test Case 5.4: Operator Records Vehicle Exit
**Role**: Operator (Security Gate)  
**Objective**: Record vehicle leaving factory premises

**Steps**:
1. Login as Operator
2. Navigate to: Operator Dashboard → Dispatch Tracking → Gate Passes tab
3. Find gatepass for Vehicle "MH-01-AB-1234"
4. Click "Record Vehicle Exit"
5. Verify:
   - Vehicle number matches
   - Driver details correct
   - Cases count: 5
   - Seal numbers intact
6. Click "Confirm Exit"
7. System records exit time automatically
8. **Expected Result**:
   - Gatepass status → "Vehicle Out"
   - Invoice status → "Dispatched"
   - Exit timestamp recorded

---

### Test Case 5.5: Operator Records Proof of Delivery (POD)
**Role**: Operator / Manager  
**Objective**: Complete delivery confirmation with customer signature

**Steps**:
1. Login as Manager/Operator
2. Navigate to: Dispatch Tracking → Proof of Delivery tab
3. Find gatepass for Vehicle "MH-01-AB-1234"
4. Click "Record POD"
5. Fill in:
   - Delivery Date & Time: Actual delivery time
   - Received By: Customer representative name
   - Cases Received: 5 (confirm count)
6. Capture customer signature on canvas (digital signature)
7. Add delivery remarks (optional)
8. Click "Submit POD"
9. **Expected Result**:
   - Gatepass status → "Delivered"
   - Invoice status → "Delivered"
   - Digital signature saved
   - Delivery complete, workflow closed

---

## 6. User & Role Management

### Test Case 6.1: Admin Creates New User
**Role**: Admin  
**Objective**: Add new employee to system

**Steps**:
1. Login as Admin
2. Navigate to: Admin Dashboard → User Management
3. Click "Create User"
4. Fill in:
   - Username: "operator.john"
   - Email: "john@kinto.com"
   - Password: (secure password)
   - Full Name: "John Smith"
   - Role: Operator
   - Status: Active
5. Click "Create User"
6. **Expected Result**: User created, can login with credentials

---

### Test Case 6.2: Admin Configures Role Permissions
**Role**: Admin  
**Objective**: Set screen-level permissions for Manager role

**Steps**:
1. Login as Admin
2. Navigate to: Admin Dashboard → Role Permissions
3. Click "Permissions" on "Manager" role
4. Configure permissions (check/uncheck):
   - Dashboard: ✓ View
   - Sales Dashboard: ✓ View
   - User Management: ✗ (No access)
   - Machines: ✓ View, ✓ Edit
   - Sales Invoices: ✓ View, ✓ Create, ✓ Edit
   - Dispatch Tracking: ✓ View, ✓ Create, ✓ Edit
   - Reports: ✓ View
5. Click "Save Permissions"
6. **Expected Result**: Manager role can only access permitted screens with allowed actions

---

### Test Case 6.3: Verify Role-Based Access Control
**Role**: All Roles  
**Objective**: Confirm users can only access permitted screens

**Test Matrix**:

| Screen | Admin | Manager | Operator | Reviewer |
|--------|-------|---------|----------|----------|
| User Management | ✓ All | ✗ | ✗ | ✗ |
| Role Permissions | ✓ All | ✗ | ✗ | ✗ |
| Sales Dashboard | ✓ View | ✓ View | ✗ | ✗ |
| Sales Invoices | ✓ All | ✓ View/Create/Edit | ✗ | ✗ |
| Checklists | ✓ All | ✓ Assign | ✓ Execute | ✓ Review |
| PM Execution | ✓ View | ✓ View | ✓ Execute | ✗ |
| Reports | ✓ All | ✓ View | ✓ View | ✓ View |

**Steps**:
1. Login as each role
2. Try accessing each screen
3. Verify access granted/denied per permissions
4. **Expected Result**: Each role sees only permitted screens in sidebar

---

## 7. Reporting & Analytics

### Test Case 7.1: Manager Generates Sales Report
**Role**: Manager  
**Objective**: View monthly sales analytics

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Sales Dashboard
3. Select filters:
   - Period: Monthly
   - Year: 2025
4. View metrics:
   - Total Revenue
   - Goods Sold
   - Total Orders
   - Average Order Value
5. View monthly breakdown table
6. **Expected Result**: Dashboard shows accurate sales data with charts

---

### Test Case 7.2: Admin Generates GST Report for Filing
**Role**: Admin  
**Objective**: Export GSTR-1 report for tax filing

**Steps**:
1. Login as Admin
2. Navigate to: Admin Dashboard → Reports
3. Select tab: "GST Reports"
4. Choose report type: "GSTR-1"
5. Select period: "January 2025"
6. Click "Generate Report"
7. Review report sections:
   - B2B invoices with GSTIN
   - HSN summary
   - Tax summary (CGST, SGST, IGST)
8. Click "Export to Excel"
9. **Expected Result**: Excel file downloaded with GSTR-1 compliant format

---

## 8. Notification System

### Test Case 8.1: Admin Configures Notifications
**Role**: Admin  
**Objective**: Set up WhatsApp and Email notifications

**Steps**:
1. Login as Admin
2. Navigate to: Admin Dashboard → Notification Settings
3. Configure:
   - Enable WhatsApp notifications
   - Enable Email notifications
   - Set reminder timing: 2 hours before deadline
4. Configure notification triggers:
   - Checklist assigned → Notify Operator
   - Checklist submitted → Notify Reviewer
   - Low stock alert → Notify Manager
   - PM overdue → Notify Manager & Admin
5. Click "Save Settings"
6. **Expected Result**: Notifications configured, users receive alerts via WhatsApp/Email

---

## 9. Vendor Management

### Test Case 9.1: Admin Creates Vendor Master
**Role**: Admin  
**Objective**: Add new supplier to system

**Steps**:
1. Login as Admin
2. Navigate to: Admin Dashboard → Vendor Master
3. Click "Add Vendor"
4. Fill in:
   - Vendor Name: "ABC Steel Suppliers"
   - GSTIN: "29ABCDE1234F1Z5"
   - Contact Person: "Rajesh Sharma"
   - Phone: "9876543210"
   - Email: "rajesh@abcsteel.com"
   - Address: Complete address
   - Payment Terms: "Net 30 days"
   - Bank Account Details
5. Click "Save Vendor"
6. **Expected Result**: Vendor added, available for PO creation

---

## 10. End-to-End Manufacturing Cycle Test

### Complete Workflow Integration Test

**Scenario**: Complete product lifecycle from raw material to delivery

**Participants**:
- Admin: System setup
- Manager: Planning & approvals
- Operator: Execution
- Reviewer: Quality verification

**Complete Flow**:

1. **Admin** creates:
   - Product master (Widget A)
   - Raw material (Steel Plate)
   - Checklist template (Quality check)
   - Invoice template

2. **Manager** schedules:
   - Assigns quality checklist to Operator
   - Issues raw material (100 kg steel)

3. **Operator** executes:
   - Completes quality checklist
   - Records production (50 units of Widget A)
   - Submits for review

4. **Reviewer**:
   - Reviews checklist
   - Approves quality
   - Sends to Manager

5. **Manager** approves:
   - Final checklist approval
   - Creates sales invoice for customer
   - Generates gatepass

6. **System automatically**:
   - Deducts inventory (50 units)
   - Updates stock levels

7. **Operator (Security)**:
   - Records vehicle exit

8. **Manager/Operator**:
   - Records POD with signature
   - Completes delivery

9. **Manager** reviews:
   - Sales dashboard analytics
   - Generates GST report

**Expected Result**: Complete traceable workflow from raw material to customer delivery with all quality checks, approvals, and compliance documentation.

---

## Test Data Requirements

### Minimum Test Data Needed:

**Users** (Create via UI):
- 1 Admin user
- 1 Manager user  
- 2 Operator users
- 1 Reviewer user

**Master Data**:
- 3 Machines
- 2 Machine Types
- 5 Raw Materials
- 3 Products
- 2 Vendors
- 3 UOM (kg, pieces, liters)
- 1 Invoice Template

**Transactional Data** (Generate through workflows):
- 5 Checklists
- 3 PM Plans
- 10 Inventory transactions
- 2 Purchase Orders
- 5 Sales Invoices
- 5 Gatepasses

---

## Notes

1. **Role Permissions**: Configure before testing each role's access
2. **Notifications**: Verify WhatsApp/Email delivery (requires API keys)
3. **Inventory Logic**: Stock deducts on gatepass creation, NOT invoice creation
4. **Status Validation**: System prevents workflow bypass (strict 400 errors)
5. **Audit Trail**: All actions logged with user, timestamp, and changes

---

## Test Execution Checklist

- [ ] All users created and can login
- [ ] Role permissions configured correctly
- [ ] Master data setup complete
- [ ] QA Checklist workflow (5 steps) ✓
- [ ] PM workflow (3 steps) ✓
- [ ] Inventory workflow (4 steps) ✓
- [ ] Sales & Dispatch workflow (5 steps) ✓
- [ ] Reports generation working ✓
- [ ] Notifications sending (if configured) ✓
- [ ] End-to-end cycle test passed ✓
