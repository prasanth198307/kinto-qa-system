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

## 8. Missed Checklist Notification Workflow

### Test Case 8.1: System Sends Overdue Checklist Alert
**Role**: System (Automatic)  
**Objective**: Automatically alert when checklist is overdue

**Scenario**: Checklist not completed by due date

**Steps**:
1. **Day 1** - Manager assigns checklist to Operator
   - Template: "Daily Quality Inspection"
   - Due Date: Today 5:00 PM
2. **5:00 PM** - Checklist still not completed by Operator
3. System automatically checks for overdue checklists
4. System sends notifications:
   - WhatsApp to Operator: "OVERDUE: Daily Quality Inspection checklist"
   - WhatsApp to Reviewer: "Checklist overdue - assigned to [Operator Name]"
   - Email to Manager: "Overdue checklist alert"
   - Dashboard alert shown
5. **Expected Result**:
   - All personnel notified
   - Checklist marked with "Overdue" status
   - Notification logged in database

---

### Test Case 8.2: Operator Completes Overdue Checklist
**Role**: Operator  
**Objective**: Complete checklist after receiving overdue alert

**Steps**:
1. Operator receives WhatsApp alert: "OVERDUE: Daily Quality Inspection"
2. Login as Operator
3. Navigate to: Operator Dashboard → My Assigned Checklists
4. See checklist marked "Overdue" with red indicator
5. Click "Start Checklist"
6. Complete all items
7. Submit for review
8. **Expected Result**:
   - Checklist submitted
   - Overdue alert cleared
   - Reviewer notified for review

---

### Test Case 8.3: Manager Monitors Overdue Checklist Compliance
**Role**: Manager  
**Objective**: Track checklist completion rates and overdue patterns

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Checklist Compliance
3. View metrics:
   - Total checklists assigned: 50
   - Completed on time: 45
   - Overdue: 3
   - Not started: 2
4. View overdue checklist details:
   - Which checklists are overdue
   - Who is assigned
   - How long overdue
5. **Expected Result**: Manager can identify compliance issues and take action

---

## 9. Payment Tracking & FIFO Allocation Workflow

### Test Case 9.1: Manager Records Advance Payment
**Role**: Manager  
**Objective**: Record customer advance payment against invoice

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Sales Invoices
3. Find invoice: INV-2025-001 (Total: ₹59,000)
4. Click "Record Payment"
5. Fill in payment details:
   - Payment Date: Today
   - Amount: ₹20,000
   - Payment Method: NEFT
   - Reference Number: "NEFT123456"
   - Payment Type: "Advance"
   - Bank Name: "HDFC Bank"
6. Click "Record Payment"
7. **Expected Result**:
   - Payment recorded
   - Invoice shows: Amount Received: ₹20,000, Balance: ₹39,000
   - Payment appears in Payment History

---

### Test Case 9.2: Manager Records Partial Payment
**Role**: Manager  
**Objective**: Record partial payment against invoice

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Sales Invoices
3. Find invoice: INV-2025-001 (Balance: ₹39,000)
4. Click "Record Payment"
5. Fill in:
   - Amount: ₹30,000
   - Payment Method: Cheque
   - Reference Number: "CHQ789012"
   - Payment Type: "Partial"
6. Click "Record Payment"
7. **Expected Result**:
   - Total received: ₹50,000 (₹20K + ₹30K)
   - Balance due: ₹9,000
   - Invoice status: "Partially Paid"

---

### Test Case 9.3: Manager Records Full Payment Settlement
**Role**: Manager  
**Objective**: Complete invoice payment with final settlement

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Sales Invoices
3. Find invoice: INV-2025-001 (Balance: ₹9,000)
4. Click "Record Payment"
5. Fill in:
   - Amount: ₹9,000
   - Payment Method: UPI
   - Reference Number: "UPI345678"
   - Payment Type: "Full"
6. Click "Record Payment"
7. **Expected Result**:
   - Total received: ₹59,000 (fully paid)
   - Balance due: ₹0
   - Invoice status: "Paid"
   - Invoice marked complete

---

### Test Case 9.4: Manager Views FIFO Payment Allocation
**Role**: Manager  
**Objective**: View how payments are allocated using FIFO method

**Scenario**: Customer makes bulk payment for multiple invoices

**Steps**:
1. Login as Manager
2. Create multiple invoices for same customer:
   - INV-001: ₹50,000 (Jan 1)
   - INV-002: ₹30,000 (Jan 5)
   - INV-003: ₹40,000 (Jan 10)
3. Customer pays ₹70,000 bulk payment (Jan 15)
4. Navigate to: Manager Dashboard → FIFO Payment Allocation
5. System shows allocation:
   - INV-001: ₹50,000 (fully paid) ✓
   - INV-002: ₹20,000 (partial)
   - INV-003: ₹0 (unpaid)
6. **Expected Result**: 
   - Oldest invoice paid first (FIFO)
   - Clear allocation trail
   - Remaining balance: ₹50,000 (INV-002: ₹10K + INV-003: ₹40K)

---

### Test Case 9.5: Manager Views Pending Payments Dashboard
**Role**: Manager  
**Objective**: Monitor all outstanding payments

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Overview
3. View "Pending Payments Dashboard" card
4. See summary:
   - Total Outstanding: ₹2,50,000
   - Total Overdue: ₹50,000
   - Invoices 30+ days: 5 invoices
5. Click "View Details"
6. See list of unpaid/partially paid invoices with:
   - Invoice number
   - Customer name
   - Total amount
   - Amount received
   - Balance due
   - Days outstanding
7. **Expected Result**: Manager has complete visibility of payment status

---

## 10. Spare Parts Management Workflow

### Test Case 10.1: Admin Creates Spare Parts Catalog
**Role**: Admin  
**Objective**: Set up spare parts inventory

**Steps**:
1. Login as Admin
2. Navigate to: Admin Dashboard → Spare Parts
3. Click "Add Spare Part"
4. Fill in:
   - Part Name: "Hydraulic Seal - 50mm"
   - Part Number: "HS-50MM-001"
   - Category: "Hydraulic Components"
   - UOM: "pieces"
   - Unit Cost: ₹500
   - Minimum Stock: 20 pieces
   - Current Stock: 50 pieces
   - Supplier: "ABC Industrial Supplies"
5. Click "Save"
6. Repeat for multiple spare parts
7. **Expected Result**: Spare parts added to catalog

---

### Test Case 10.2: Manager Associates Spare Parts with Machine
**Role**: Manager  
**Objective**: Link spare parts to specific machine for PM tracking

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Machines
3. Select machine: "Hydraulic Press 01"
4. Click "Manage Spare Parts"
5. Add associated parts:
   - Hydraulic Seal - 50mm
   - Hydraulic Fluid (5L)
   - Pressure Gauge
6. Set replacement frequency for each:
   - Hydraulic Seal: Every 6 months
   - Hydraulic Fluid: Every 3 months
   - Pressure Gauge: Every 12 months
7. Click "Save Configuration"
8. **Expected Result**: Machine linked to spare parts, PM schedule aware

---

### Test Case 10.3: Operator Uses Spare Parts During PM Execution
**Role**: Operator  
**Objective**: Record spare parts consumption during maintenance

**Steps**:
1. Login as Operator
2. Navigate to: Operator Dashboard → PM Execution
3. Start PM: "Monthly Hydraulic System Check"
4. During execution, click "Record Spare Parts Used"
5. Select parts used:
   - Hydraulic Seal - 50mm: 2 pieces
   - Hydraulic Fluid: 5 liters
6. System shows:
   - Current stock: 50 → 48 pieces (Seals)
   - Current stock: 100L → 95L (Fluid)
7. Complete PM execution
8. **Expected Result**:
   - Spare parts inventory deducted
   - PM execution record includes parts used
   - Low stock alert if below minimum

---

### Test Case 10.4: Manager Views Spare Parts Consumption Report
**Role**: Manager  
**Objective**: Track spare parts usage and costs

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Reports → Spare Parts Usage
3. Select filters:
   - Date Range: Last 3 months
   - Machine: "Hydraulic Press 01"
4. View report showing:
   - Parts consumed
   - Quantity used
   - Total cost
   - Linked to which PM execution
5. Identify high-consumption parts
6. **Expected Result**: Can plan purchasing and budget for spare parts

---

## 11. Notification System Configuration

### Test Case 11.1: Admin Configures Notifications
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

## 12. Printing & Document Export Workflow

### Test Case 12.1: Manager Prints Sales Invoice
**Role**: Manager  
**Objective**: Generate printable invoice for customer

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Sales Invoices
3. Find invoice: INV-2025-001
4. Click "Print" button (or Eye icon → Print)
5. System opens print preview showing:
   - Company logo and GST details
   - Invoice number and date
   - Buyer and seller information
   - Itemized list with HSN codes
   - Tax breakdown (CGST, SGST, IGST)
   - Total amount in words
   - Bank account details
   - Terms & conditions
   - Authorized signatory
6. Click browser Print (Ctrl+P)
7. Save as PDF or print physically
8. **Expected Result**: Professional A4-sized invoice ready for customer

---

### Test Case 12.2: Operator Prints Gatepass
**Role**: Operator  
**Objective**: Generate gatepass document for security gate

**Steps**:
1. Login as Operator
2. Navigate to: Operator Dashboard → Dispatch Tracking → Gate Passes
3. Find gatepass: GP-2025-001
4. Click "Print Gatepass" button
5. System opens print preview showing:
   - Company branding
   - Gatepass number and date
   - Vehicle details (number, driver name, contact)
   - Customer/destination details
   - Itemized list with quantities
   - Cases count and seal numbers
   - Security verification section
   - Signature blocks (Issued By, Received By, Security)
6. Click browser Print
7. **Expected Result**: 
   - Gatepass printed for security gate
   - Driver receives copy
   - Office keeps copy

---

### Test Case 12.3: Manager Prints Purchase Order
**Role**: Manager  
**Objective**: Generate PO document for vendor

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Purchase Orders
3. Find PO: PO-2025-001
4. Click "Print" button
5. System opens print preview showing:
   - Company letterhead
   - PO number and date
   - Vendor details
   - Delivery address
   - Itemized list with specifications
   - Rates and amounts
   - Tax calculations
   - Total amount
   - Payment terms
   - Delivery date
   - Terms & conditions
6. Click browser Print
7. **Expected Result**: Professional PO document for vendor

---

### Test Case 12.4: Admin Exports GST Report to Excel
**Role**: Admin  
**Objective**: Export GSTR-1 data for government filing

**Steps**:
1. Login as Admin
2. Navigate to: Admin Dashboard → Reports → GST Reports
3. Select:
   - Report Type: GSTR-1
   - Period: January 2025
4. Click "Generate Report"
5. Review on-screen:
   - B2B invoices (with GSTIN)
   - B2C invoices (without GSTIN)
   - HSN summary
   - Tax summary
6. Click "Export to Excel"
7. **Expected Result**:
   - Excel file downloaded
   - Proper formatting for GSTIN portal upload
   - All required fields present
   - Ready for tax filing

---

### Test Case 12.5: Manager Exports Inventory Report to JSON
**Role**: Manager  
**Objective**: Export inventory data for analysis

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Reports → Inventory Reports
3. Select filters:
   - Report Type: Current Stock Levels
   - Category: All
4. Click "Generate Report"
5. Review report showing:
   - Material/Product name
   - Current stock
   - Minimum stock level
   - Unit of measure
   - Last updated
6. Click "Export to JSON"
7. **Expected Result**: JSON file downloaded with inventory data

---

### Test Case 12.6: Manager Prints Raw Material Issuance Report
**Role**: Manager  
**Objective**: Generate material issuance report for records

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → Reports → Operational Reports
3. Select:
   - Report Type: Raw Material Issuance
   - Date Range: Last 7 days
4. Click "Generate Report"
5. Review report showing:
   - Issuance number
   - Date and time
   - Material details
   - Quantity issued
   - Issued to (production line/job)
   - Issued by (user)
6. Click "Print Report"
7. **Expected Result**: A4 printable report with company branding

---

### Test Case 12.7: Manager Prints PM Execution Report
**Role**: Manager  
**Objective**: Generate maintenance completion report

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → PM History
3. Find completed PM: "Monthly Hydraulic System Check"
4. Click "View Details" → "Print Report"
5. System shows report with:
   - Machine details
   - PM template name
   - Execution date and time
   - Operator name
   - All completed tasks with checkmarks
   - Spare parts used
   - Execution notes
   - Total time taken
6. Click browser Print
7. **Expected Result**: Maintenance record for compliance/audit

---

## 13. System Alerts & Notifications Workflow

### Test Case 13.1: System Sends Low Stock Alert
**Role**: System (Automatic)  
**Objective**: Alert manager when inventory falls below minimum level

**Scenario**: Raw material stock drops below reorder point

**Steps**:
1. **Initial Setup**:
   - Steel Plate 5mm
   - Minimum Stock: 500 kg
   - Reorder Level: 200 kg
   - Current Stock: 250 kg
2. Manager issues 100 kg for production
3. **Current Stock drops to 150 kg** (below reorder level)
4. System automatically:
   - Checks inventory levels
   - Detects: Steel Plate 5mm = 150 kg < 200 kg
   - Sends notifications:
     * WhatsApp to Manager: "LOW STOCK: Steel Plate 5mm - Current: 150kg, Min: 200kg"
     * Email to Admin: "Reorder alert for Steel Plate 5mm"
     * Dashboard alert with red indicator
5. **Expected Result**:
   - Manager receives immediate alert
   - Can create purchase order
   - Stock level visible in alerts panel

---

### Test Case 13.2: Manager Responds to Low Stock Alert
**Role**: Manager  
**Objective**: Take action on low stock notification

**Steps**:
1. Manager receives WhatsApp: "LOW STOCK: Steel Plate 5mm"
2. Login as Manager
3. See dashboard alert: "3 items below reorder level"
4. Click alert to view details:
   - Steel Plate 5mm: 150 kg (Min: 200 kg)
   - Hydraulic Fluid: 15 L (Min: 20 L)
   - Seals: 8 pcs (Min: 10 pcs)
5. Click "Create PO" for Steel Plate
6. System pre-fills PO with:
   - Material: Steel Plate 5mm
   - Suggested Quantity: 1000 kg (to reach optimal level)
   - Last vendor used
7. Complete and submit PO
8. **Expected Result**:
   - PO created
   - Alert cleared after stock replenished
   - Vendor notified

---

### Test Case 13.3: System Sends PM Overdue Alert
**Role**: System (Automatic)  
**Objective**: Alert when preventive maintenance is overdue

**Scenario**: Scheduled PM not completed by due date

**Steps**:
1. **Scheduled PM**:
   - Machine: Hydraulic Press 01
   - PM: Monthly Hydraulic System Check
   - Due Date: Jan 15, 2025
2. **Jan 16, 2025** - PM still not executed
3. System automatically:
   - Checks PM schedule daily
   - Detects overdue: 1 day past due
   - Sends escalation:
     * WhatsApp to Operator: "OVERDUE: Monthly Hydraulic Check - 1 day late"
     * Email to Manager: "PM overdue alert - Hydraulic Press 01"
     * Dashboard shows red "Overdue" indicator
4. **Expected Result**:
   - Operator notified to execute immediately
   - Manager aware of compliance issue
   - PM marked as "Overdue" with days count

---

### Test Case 13.4: Manager Views All System Alerts Dashboard
**Role**: Manager  
**Objective**: Monitor all active system alerts in one place

**Steps**:
1. Login as Manager
2. Navigate to: Manager Dashboard → System Alerts
3. View alerts summary:
   - **Low Stock Alerts**: 3 items
   - **Overdue PMs**: 2 tasks
   - **Overdue Checklists**: 1 checklist
   - **Pending Approvals**: 5 items
4. Filter by:
   - Alert Type: All / Low Stock / Overdue PM / Checklist
   - Priority: High / Medium / Low
   - Date Range: Last 7 days
5. View detailed list showing:
   - Alert type and message
   - Severity (color-coded)
   - Triggered date/time
   - Status (Active / Acknowledged / Resolved)
   - Action button
6. **Expected Result**: Complete visibility of all system alerts

---

### Test Case 13.5: System Sends Invoice Payment Reminder
**Role**: System (Automatic)  
**Objective**: Remind manager of overdue invoice payments

**Scenario**: Customer payment overdue

**Steps**:
1. **Invoice Details**:
   - Invoice: INV-2025-001
   - Amount: ₹59,000
   - Payment Terms: Net 30 days
   - Invoice Date: Jan 1, 2025
   - Due Date: Jan 31, 2025
2. **Feb 1, 2025** - No payment received
3. System automatically:
   - Checks payment status daily
   - Detects overdue payment (1 day)
   - Sends reminders:
     * Email to Manager: "Payment overdue - INV-2025-001 - Customer: XYZ Industries"
     * Dashboard shows in "Overdue Payments" widget
4. **Feb 8, 2025** - Still unpaid (7 days overdue)
5. System sends escalation:
   * WhatsApp to Manager: "URGENT: Payment 7 days overdue - ₹59,000"
   * Email to Admin
6. **Expected Result**:
   - Manager can follow up with customer
   - Payment aging tracked
   - Escalation at 7, 15, 30 days

---

### Test Case 13.6: Operator Acknowledges and Resolves Alert
**Role**: Operator  
**Objective**: Acknowledge alert and mark as resolved

**Steps**:
1. Operator receives alert: "OVERDUE: Monthly Hydraulic Check"
2. Login as Operator
3. Navigate to: Operator Dashboard → My Alerts
4. See alert with "Acknowledge" button
5. Click "Acknowledge"
6. System records:
   - Acknowledged by: Operator name
   - Acknowledged at: Timestamp
7. Execute the overdue PM
8. Click "Mark as Resolved" on alert
9. Add resolution note: "PM completed, all tasks done"
10. **Expected Result**:
    - Alert status → Resolved
    - Removed from active alerts
    - Logged in alert history

---

## 14. Vendor Management

### Test Case 14.1: Admin Creates Vendor Master
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

## 15. End-to-End Manufacturing Cycle Test

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
