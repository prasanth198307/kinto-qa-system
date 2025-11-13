# KINTO Operations & QA Management System - Test Cases

**🎉 100% Complete Test Coverage: 26 Workflows | 100 Test Cases**
**Last Updated: November 13, 2025 (Final - E2E Integration Added)**

> **📋 Test Status Legend**:  
> - ⬜ **PENDING** = Test case documented and ready for QA execution (not yet executed)  
> - ✅ **Completed** = Test case executed and validated  
> 
> **100% coverage** refers to **documentation completeness** - all critical workflows have comprehensive test cases ready for execution.

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

### Test Case 1.6: WhatsApp Incremental Checklist Completion
**Role**: Operator  
**Objective**: Complete checklist tasks incrementally via WhatsApp with real-time submission  
**Priority**: High

> **🔑 KEY FEATURE**: Operators can complete checklists task-by-task via WhatsApp without logging into the web app, enabling mobile-first operations.

**Pre-requisite**: 
- WhatsApp Business Cloud API configured
- Operator phone number registered in system
- Checklist assigned (TC 1.2 completed)

**Steps**:
1. **WhatsApp Reminder Received**:
   - Operator receives WhatsApp message at shift start:
   ```
   🔔 KINTO QA Reminder
   Checklist: Daily Quality Inspection - Machine A
   Due: Today 2:00 PM
   
   Reply with task number to start (e.g., "1")
   ```

2. **Start First Task**:
   - Operator replies: "1"
   - System responds:
   ```
   ✅ Task 1/5: Temperature Check
   Please measure machine temperature (°C)
   
   Reply with the reading (e.g., "85")
   ```

3. **Submit Task 1 Reading**:
   - Operator replies: "85"
   - System validates and confirms:
   ```
   ✅ Task 1 Complete: 85°C
   Status: NORMAL (Range: 75-95°C)
   
   Next task? Reply "2" or "skip"
   ```

4. **Continue Incrementally**:
   - Operator replies: "2"
   - System sends Task 2 details
   - Process continues for all 5 tasks

5. **Final Submission**:
   - After task 5, system sends:
   ```
   🎉 Checklist Complete!
   5/5 tasks submitted
   
   Review your submission:
   [Web Link]
   
   Your manager will be notified.
   ```

**Expected Results**:
✅ **Incremental Submission**:
- Each task submitted separately in real-time
- No need to complete all tasks at once
- Progress saved after each task

✅ **WhatsApp Bidirectional Communication**:
- System sends prompts for each task
- Operator sends readings/responses
- System validates and confirms
- Clear navigation (next task, skip, help)

✅ **Real-Time Validation**:
- Out-of-range values flagged immediately
- Format errors caught (text instead of number)
- Operator can correct before moving forward

✅ **System Integration**:
- Each task updates database in real-time
- Checklist progress visible in web app
- Manager notified when complete
- Same workflow as web app completion (TC 1.3)

✅ **User Experience**:
- No login required
- Mobile-friendly (any phone with WhatsApp)
- Simple text-based commands
- Guided step-by-step

**Test Status**: ⬜ PENDING

---

### Test Case 1.7: WhatsApp Photo Upload for Task Evidence
**Role**: Operator  
**Objective**: Upload photos as task evidence via WhatsApp  
**Priority**: High

**Pre-requisite**: TC 1.6 in progress - Operator completing checklist via WhatsApp

**Steps**:
1. **Photo-Required Task**:
   - Operator at Task 3: "Visual Inspection"
   - System sends:
   ```
   📸 Task 3/5: Visual Inspection
   Check for leaks, cracks, or damage
   
   📷 Photo required
   Send photo of machine condition
   ```

2. **Operator Takes Photo**:
   - Operator uses phone camera
   - Takes photo of machine
   - Sends photo via WhatsApp

3. **System Processes Photo**:
   - System receives image
   - Validates image (format, size)
   - Stores in cloud storage
   - Links to checklist task
   - Responds:
   ```
   ✅ Photo received!
   
   Add remarks? Reply with text
   Or type "ok" to continue
   ```

4. **Add Remarks**:
   - Operator replies: "Small oil stain noticed, cleaned"
   - System confirms:
   ```
   ✅ Task 3 Complete
   Photo + Remarks saved
   
   Next task? Reply "4"
   ```

5. **Multiple Photos** (Optional):
   - For tasks requiring multiple angles
   - Operator sends 2-3 photos consecutively
   - System processes each image
   - Confirms when all received

**Expected Results**:
✅ **Photo Upload via WhatsApp**:
- Images received and stored
- Linked to specific task
- Thumbnail visible in web app
- Full resolution downloadable

✅ **Image Processing**:
- Automatic format conversion (JPEG/PNG)
- Image compression for storage
- Metadata extraction (timestamp, location if available)
- Virus scanning

✅ **Evidence Validation**:
- Manager can review photos in web app
- Photos attached to final checklist report
- Part of audit trail
- Cannot be deleted (immutable)

✅ **Error Handling**:
- File too large → "Please send smaller image"
- Invalid format → "Please send JPEG or PNG"
- Upload failed → Retry mechanism

**Test Status**: ⬜ PENDING

---

### Test Case 1.8: WhatsApp Spare Part Request During Checklist
**Role**: Operator  
**Objective**: Request spare parts via WhatsApp while completing checklist  
**Priority**: Medium

**Pre-requisite**: TC 1.6 in progress - Operator completing checklist

**Steps**:
1. **Issue Detected During Inspection**:
   - Operator at Task 4: "Belt Tension Check"
   - Finds worn belt during inspection
   - Types special command: "spare"

2. **System Initiates Spare Part Request**:
   - System responds:
   ```
   🔧 Spare Part Request
   
   What part do you need?
   Reply with part name or number
   
   Or type "cancel" to go back
   ```

3. **Operator Specifies Part**:
   - Operator replies: "V-Belt 5mm"
   - System searches catalog:
   ```
   Found 2 matches:
   1. V-Belt 5mm Standard (Stock: 12)
   2. V-Belt 5mm Heavy Duty (Stock: 5)
   
   Reply with number (1 or 2)
   ```

4. **Select Part and Quantity**:
   - Operator replies: "1"
   - System asks:
   ```
   V-Belt 5mm Standard selected
   
   How many do you need?
   (Current stock: 12)
   ```
   - Operator replies: "2"

5. **Confirm Request**:
   - System creates spare part request:
   ```
   ✅ Spare Part Request Created
   
   Part: V-Belt 5mm Standard
   Quantity: 2
   Request ID: SPR-2025-045
   
   Manager will approve shortly.
   
   Continue checklist? Reply "5"
   ```

6. **Request Processing**:
   - Manager receives notification
   - Request appears in Spare Parts Dashboard
   - Manager approves/rejects
   - Operator notified of decision via WhatsApp

**Expected Results**:
✅ **Spare Part Request via WhatsApp**:
- Created without leaving WhatsApp conversation
- Linked to current checklist
- Proper workflow (catalog search → selection → approval)

✅ **Integration with Spare Parts System**:
- Request saved in database
- Stock levels checked
- Manager approval workflow triggered
- Request ID generated

✅ **Operator Experience**:
- Seamless mid-checklist request
- Can continue checklist immediately
- No disruption to workflow
- Confirmation when approved/rejected

✅ **Manager Visibility**:
- Request shows checklist context
- Can see which machine/task triggered request
- Urgency indicated (during active checklist)

**Commands Supported**:
- `spare` - Request spare part
- `help` - Show available commands
- `status` - Check checklist progress
- `photo` - Retake photo
- `skip` - Skip current task

**Test Status**: ⬜ PENDING

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

> **📋 Workflow Update (November 2025)**: Raw material issuance now defaults to **BOM-Driven Auto-Populate** (see TC 20.1). The manual workflow below (TC 4.2) is retained for edge cases: products without BOM, ad-hoc adjustments, or off-BOM material additions.

### Test Case 4.1: Admin Configures Raw Material with Inventory Modes
**Role**: Admin  
**Objective**: Set up raw materials with two different inventory tracking modes  
**Priority**: High

> **🔄 KEY FEATURE**: Raw materials support TWO inventory modes:
> 1. **Opening Stock Entry Only** - One-time initial stock setup
> 2. **Ongoing Inventory** - Continuous tracking with receipts, returns, adjustments

**Scenario A: Opening Stock Entry Only Mode**

**Use Case**: Initial system setup, warehouse stock takeover, one-time inventory recording

**Steps**:
1. Login as Admin
2. Navigate to: Inventory → Raw Materials
3. Click "Add Raw Material"
4. Fill in basic details:
   - Material Code: "STL-PLT-5MM"
   - Material Name: "Steel Plate 5mm"
   - Category: "Steel"
   - UOM: "kg"
   - Minimum Stock Level: 500 kg
   - Reorder Level: 200 kg
5. **Select Inventory Mode**: "Opening Stock Entry Only"
6. Enter opening stock details:
   - Opening Stock: 1000 kg
   - Opening Date: Today
   - Opening Stock Location: "Warehouse A"
7. Click "Save"

**Expected Results**:
✅ **Material Created** (Opening Stock Mode):
- Material saved with mode: "Opening Stock Entry Only"
- Current Stock: 1000 kg (from opening stock)
- Opening date recorded
- **Receipts/Returns/Adjustments**: Disabled (not applicable in this mode)
- Inventory deducts on issuance only

---

**Scenario B: Ongoing Inventory Mode (with Raw Material Type Linkage)**

**Use Case**: Active inventory management with purchase receipts, production returns, stock adjustments

> **🔗 IMPORTANT**: Raw Materials can be linked to **Raw Material Types** (see TC 18.1-18.3) which provide:
> - Conversion formulas (bag → kg → pieces)
> - Auto-populated unit conversions
> - Standardized calculation methods

**Steps**:
1. Login as Admin
2. Navigate to: Inventory → Raw Materials
3. Click "Add Raw Material"
4. Fill in basic details:
   - Material Code: "RESIN-PET-21G"
   - Material Name: "PET Resin 21g Preform"
   - Category: "Plastic Resins"
   - **Raw Material Type**: Select "Preform" (provides conversion formula)
     - **Effect**: Auto-populates conversion method and units
     - **Example**: 1 Bag = 25 kg, 21g per piece → 1190 pieces/bag
     - See TC 18.2 for auto-fetch behavior
   - UOM: "kg" (base unit for calculations)
   - Minimum Stock Level: 2000 kg
   - Reorder Level: 500 kg
   - Loss Percentage: 2% (optional, for wastage calculation)
5. **Select Inventory Mode**: "Ongoing Inventory"
6. Enter initial stock (optional):
   - Opening Stock: 0 kg (or enter if migrating from another system)
   - Opening Date: Today
7. Click "Save"

**Expected Results**:
✅ **Material Created** (Ongoing Mode with Type Linkage):
- Material saved with mode: "Ongoing Inventory"
- **Raw Material Type linked**: "Preform" with conversion formula
- Conversion method: Formula-Based (auto-populated from type)
- Current Stock: 0 kg (or opening stock if provided)
- **Receipts**: Enabled (stock increases on PO receipt)
- **Returns**: Enabled (stock increases from production reconciliation)
- **Adjustments**: Enabled (manual stock corrections)
- Full transaction history tracking
- **Conversion calculations** available for BOM-driven issuance (TC 20.1)

---

**Inventory Mode Comparison**:

| Feature | Opening Stock Only | Ongoing Inventory |
|---------|-------------------|-------------------|
| **Use Case** | Initial setup | Active management |
| **Opening Stock** | Required | Optional |
| **Raw Material Type Link** | ✅ Optional | ✅ Optional |
| **Conversion Formula** | ✅ Yes (if type linked) | ✅ Yes (if type linked) |
| **Purchase Receipts** | ❌ Not tracked | ✅ Tracked |
| **Production Returns** | ❌ Not tracked | ✅ Tracked |
| **Stock Adjustments** | ❌ Not available | ✅ Available |
| **Issuance Deduction** | ✅ Yes | ✅ Yes |
| **Transaction History** | Basic | Complete |

> **💡 Note**: Both inventory modes support **Raw Material Type linkage** (TC 18.1-18.3) for conversion formulas. The difference is in how receipts/returns/adjustments are tracked.

**Cross-References**:
- TC 18.1 - Create Raw Material Type with conversion formula
- TC 18.2 - Raw Material Type auto-fetch behavior
- TC 20.1 - BOM-Driven issuance uses conversion formulas

**Test Status**: ⬜ PENDING

---

### Test Case 4.2: Manual/Ad-hoc Raw Material Issuance (Fallback Scenario)
**Role**: Manager  
**Objective**: Issue raw materials manually when BOM is not available or for off-BOM adjustments  
**Use Cases**: 
- Products without BOM defined
- Ad-hoc maintenance/repair materials
- Off-BOM additional items
- Manual overrides for special cases

> **Note**: For standard production with BOM, use **TC 20.1: BOM-Driven Auto-Populate** (primary workflow)

**Steps**:
1. Login as Manager
2. Navigate to: Production → Raw Material Issuance
3. Click "Issue Material" button
4. Fill header details:
   - Issuance Date: Today
   - Issued To: "Production Line 1"
   - Production Reference: "Maintenance Job #1234"
   - Leave "Product" field empty (or select product without BOM)
5. Click "Add off-BOM Item" to manually add materials
6. For each material:
   - Select Material: "Steel Plate 5mm"
   - Enter Quantity: 100 kg
   - Add Remarks: "Ad-hoc maintenance repair"
7. Click "Create Issuance"
8. **Expected Result**: 
   - Issuance created successfully
   - Raw material inventory deducted (100 kg)
   - Transaction recorded with manual entry marker
   - Stock level updated

**Edge Case Coverage**:
- ✅ Products without BOM
- ✅ Off-BOM materials (consumables, spare parts)
- ✅ Manual quantity overrides
- ✅ Ad-hoc/maintenance issuances

---

### Test Case 4.3: Operator Records Finished Goods Production [OBSOLETE]
**Status**: ❌ **OBSOLETE** - Replaced by automated workflow  
**Role**: Operator  
**Objective**: Record completed production output

> **⚠️ WORKFLOW CHANGED (November 2025)**: Finished goods are NO LONGER manually entered. They are **auto-created from Production Entry** (see TC 21.1). This test case is retained for historical reference only.

**New Workflow**:
1. Operator creates **Production Entry** (TC 21.1)
2. System **automatically creates Finished Goods** with:
   - Batch Number: Auto-generated as `IssuanceNumber-Date-Shift`
   - Quality Status: `pending` (requires approval)
   - Quantity: From production entry
3. Quality inspector **approves** finished goods (TC 21.2)
4. Only then are goods available for sale

**Old Steps (No Longer Used)**:
1. ~~Login as Operator~~
2. ~~Navigate to: Operator Dashboard → Finished Goods~~
3. ~~Click "Add Production"~~
4. ~~Fill in manual details~~
5. ~~Click "Save Production"~~

**Expected Result**: N/A - See TC 21.1 for new production workflow

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

### Test Case 5.2: Manager Creates Sales Invoice (NO Inventory Deduction)
**Role**: Manager  
**Objective**: Generate GST-compliant invoice for customer order

> **⚠️ IMPORTANT**: Invoice creation does **NOT deduct inventory**. Inventory deducts only on **Gatepass creation** (TC 5.3).

**Pre-requisite**: Finished goods must be `approved` status (see TC 21.2)

**Steps**:
1. Login as Manager
2. Navigate to: Finance & Sales → Sales Invoices
3. Click "Create Invoice"
4. Select Template: "Standard GST Invoice"
5. Fill in customer details:
   - Invoice Date: Today
   - Customer: "XYZ Industries"
   - Customer GSTIN: "29XYZAB5678C1D2"
   - Billing Address
   - Shipping Address
6. Add invoice items:
   - Product: "1 Liter PET Bottle Water" (select from approved finished goods)
   - Quantity: 50 units
   - Rate: ₹1,000/unit
   - HSN Code: 8481
   - GST Rate: 18%
7. System auto-calculates:
   - Subtotal: ₹50,000
   - CGST 9%: ₹4,500
   - SGST 9%: ₹4,500
   - **Invoice Total: ₹59,000**
8. Review print preview (optional)
9. Click "Create Invoice"

**Expected Results**:
✅ **Invoice Created**:
- Invoice number auto-assigned (e.g., INV-2025-001)
- Status: "Pending" (awaiting gatepass)
- GST calculation correct
- Invoice appears in invoice list

✅ **Inventory Status**:
- **Inventory NOT deducted** (remains unchanged)
- Finished goods still show in inventory
- Deduction happens on gatepass creation (TC 5.3)

✅ **Document Generation**:
- GST-compliant invoice PDF generated
- Can print/download invoice
- Ready for gatepass generation

**Common Mistake**: ❌ Expecting inventory to deduct here (it doesn't!)

**Test Status**: ⬜ PENDING

---

### Test Case 5.3: Manager Generates Gatepass (INVENTORY DEDUCTED HERE)
**Role**: Manager  
**Objective**: Create gatepass for material dispatch and deduct inventory

> **🔑 CRITICAL**: This is when **INVENTORY IS DEDUCTED**! Not on invoice creation, but on gatepass creation.

**Pre-requisite**: TC 5.2 completed - Invoice created with status "Pending"

**Steps**:
1. Login as Manager
2. Navigate to: Finance & Sales → Dispatch Tracking → Invoices tab
3. Find invoice for "XYZ Industries" (INV-2025-001, Total: ₹59,000)
4. Click "Generate Gatepass" button
5. System auto-fills:
   - Invoice number and date
   - Items from invoice (50 units of 1 Liter PET Bottle Water)
   - Customer information
   - Billing/shipping address
6. Add dispatch details:
   - Vehicle Number: "MH-01-AB-1234"
   - Driver Name: "Ramesh Kumar"
   - Driver Phone: "9876543210"
   - Number of Cases: 5
   - Seal Numbers: "SEAL001, SEAL002"
   - Expected Dispatch Date/Time: Today
7. Review gatepass preview (optional)
8. Click "Create Gatepass"

**Expected Results**:
✅ **Gatepass Created**:
- Gatepass number auto-assigned (e.g., GP-2025-001)
- Status: "Generated" (ready for vehicle exit)
- Linked to invoice INV-2025-001
- Printable gatepass PDF generated

✅ **Inventory Deduction** (HAPPENS NOW!):
- **50 units deducted from finished goods**
- Inventory updated immediately
- Stock level reduced
- Transaction recorded in inventory log
- Audit trail: "Deducted for Gatepass GP-2025-001"

✅ **Status Updates**:
- Invoice status: "Pending" → "Ready for Dispatch"
- Gatepass status: "Generated"
- Dispatch workflow proceeds to TC 5.4 (Vehicle Exit)

✅ **Tamper-Proof State Machine**:
- Cannot modify invoice after gatepass created
- Cannot delete gatepass without inventory return (see TC 5.7)
- State transitions validated by backend

**Verification Steps**:
1. Navigate to: Inventory → Finished Goods
2. Verify stock reduced by 50 units
3. Check inventory transaction log shows deduction

**Test Status**: ⬜ PENDING

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

### Test Case 5.6: Invoice Cancellation with Gatepass Check
**Role**: Manager  
**Objective**: Cancel an invoice and verify system prevents cancellation if gatepass exists  
**Priority**: High

> **🔒 BUSINESS RULE**: Cannot cancel invoice if gatepass has been created (prevents inventory discrepancies)

**Scenario A: Cancel Invoice WITHOUT Gatepass** ✅

**Steps**:
1. Login as Manager
2. Navigate to: Finance & Sales → Sales Invoices
3. Find invoice with status "Pending" (no gatepass created)
4. Click "Cancel Invoice" button
5. Confirm cancellation reason: "Customer order cancelled"
6. Click "Confirm Cancellation"

**Expected Results**:
✅ **Invoice Cancelled**:
- Invoice status: "Pending" → "Cancelled"
- Invoice marked as void
- Cannot be used for gatepass creation
- Cancellation recorded with timestamp and user

✅ **Inventory Behavior**:
- **No inventory impact** (inventory was never deducted)
- Finished goods remain in stock
- Available for other invoices

**Scenario B: Attempt to Cancel Invoice WITH Gatepass** ❌

**Steps**:
1. Find invoice with status "Ready for Dispatch" (gatepass created)
2. Click "Cancel Invoice" button
3. System shows error message

**Expected Results**:
❌ **Cancellation Blocked**:
- Error: "Cannot cancel invoice - Gatepass already created (GP-2025-001)"
- Instruction: "Cancel gatepass first (TC 5.7), then cancel invoice"
- Invoice status unchanged
- Tamper-proof state machine enforced

**Test Status**: ⬜ PENDING

---

### Test Case 5.7: Gatepass Cancellation with Automatic Inventory Return
**Role**: Manager  
**Objective**: Cancel gatepass and verify automatic inventory return  
**Priority**: Critical

> **🔄 KEY FEATURE**: Cancelling gatepass **automatically returns inventory** to finished goods!

**Pre-requisite**: TC 5.3 completed - Gatepass created (inventory deducted)

**Steps**:
1. Login as Manager
2. Navigate to: Finance & Sales → Dispatch Tracking → Gate Passes tab
3. Find gatepass: GP-2025-001 (Status: "Generated")
4. Verify current finished goods stock (should be reduced by 50 units)
5. Click "Cancel Gatepass" button
6. Enter cancellation reason: "Vehicle breakdown - order postponed"
7. Click "Confirm Cancellation"

**Expected Results**:
✅ **Gatepass Cancelled**:
- Gatepass status: "Generated" → "Cancelled"
- Gatepass voided, cannot be used for vehicle exit
- Cancellation timestamp and reason recorded

✅ **Automatic Inventory Return** (CRITICAL):
- **50 units automatically returned to finished goods**
- Inventory stock restored to pre-gatepass level
- Transaction logged: "Returned from cancelled Gatepass GP-2025-001"
- Audit trail maintained

✅ **Invoice Status Rollback**:
- Invoice status: "Ready for Dispatch" → "Pending"
- Invoice now available for new gatepass creation
- Can be cancelled if needed (TC 5.6 Scenario A)

✅ **State Machine Validation**:
- Cannot cancel gatepass if vehicle has exited (status: "Vehicle Out")
- Cannot cancel if POD recorded (status: "Delivered")
- Backend validates all state transitions

**Verification Steps**:
1. Navigate to: Inventory → Finished Goods
2. Verify stock increased by 50 units
3. Check inventory transaction log shows return
4. Verify invoice status reverted to "Pending"

**Edge Cases**:
- ❌ Cannot cancel gatepass after vehicle exit
- ❌ Cannot cancel gatepass after delivery (POD recorded)
- ✅ Can create new gatepass from same invoice after cancellation

**Test Status**: ⬜ PENDING

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

### Test Case 6.4: Complete 36-Screen Permission Testing
**Role**: Admin  
**Objective**: Test granular permissions across all 36 system screens with comprehensive CRUD validation  
**Priority**: High

> **🔑 KEY FEATURE**: KINTO implements screen-level RBAC across 36 screens with granular Create/Read/Update/Delete permissions per role.

**Test Scope**: All 36 screens across 6 navigation sections

**Steps**:

**1. Configure Test Roles** (Admin creates 3 test roles):

**Role A - Production Manager**:
- ✅ Production Entry (Create/Edit)
- ✅ Production Reconciliation (Create/Edit/View)
- ✅ Raw Material Issuance (View only)
- ✅ Product Master (View only)
- ✅ Variance Analytics (View)
- ❌ All Finance screens
- ❌ User Management
- ❌ Role Permissions

**Role B - Finance User**:
- ✅ Sales Invoices (Create/Edit/View)
- ✅ Payment Recording (Create)
- ✅ Credit Notes (View)
- ✅ Pending Payments (View)
- ✅ Gatepass (View only)
- ❌ All Production screens
- ❌ User Management
- ❌ Role Permissions

**Role C - QA Reviewer**:
- ✅ Checklists (Review only)
- ✅ Sales Returns (Quality Check)
- ✅ PM Execution (Review)
- ❌ All Finance screens
- ❌ All Production screens
- ❌ User Management

**2. Test Production Manager (36-Screen Checklist)**:

**Main Section (6 screens)**:
- [ ] Dashboard - ✅ Can view
- [ ] Sales Dashboard - ❌ No access (finance-related)
- [ ] Operators Dashboard - ❌ No access
- [ ] Reviewer Dashboard - ❌ No access
- [ ] Manager Dashboard - ✅ Can view
- [ ] Admin Dashboard - ❌ No access (admin only)

**Configuration (11 screens)**:
- [ ] Users - ❌ No access
- [ ] Roles - ❌ No access
- [ ] Role Permissions - ❌ No access
- [ ] Machines - ✅ View only
- [ ] Vendors - ❌ No access (procurement)
- [ ] Products - ✅ View only
- [ ] Product Categories - ✅ View only
- [ ] Product Types - ✅ View only
- [ ] Raw Materials - ✅ View only
- [ ] Raw Material Types - ✅ View only
- [ ] Checklist Templates - ❌ No access (QA)

**Production (3 screens)**:
- [ ] Production Entry - ✅ Create + Edit
- [ ] Production Reconciliation - ✅ Create + Edit + View
- [ ] Variance Analytics - ✅ View only

**Operations (7 screens)**:
- [ ] Checklists - ❌ No access (QA)
- [ ] PM Templates - ❌ No access (maintenance)
- [ ] PM Execution - ❌ No access
- [ ] Spare Parts Catalog - ❌ No access
- [ ] Spare Parts Requests - ❌ No access
- [ ] Raw Material Entry - ❌ No access (warehouse)
- [ ] Raw Material Issuance - ✅ View only

**Finance & Sales (6 screens)**:
- [ ] Sales Invoices - ❌ No access
- [ ] Payment Recording - ❌ No access
- [ ] Gatepass - ❌ No access
- [ ] Dispatch Tracking - ❌ No access
- [ ] Pending Payments - ❌ No access
- [ ] Credit Notes - ❌ No access

**Production Operations (3 screens)**:
- [ ] Sales Returns - ❌ No access (QA)
- [ ] Purchase Orders - ❌ No access (procurement)
- [ ] Unified Reports - ✅ View only

**3. Test Finance User (Same 36-Screen Checklist)**:
- Verify all Finance screens accessible
- Verify all Production screens blocked
- Verify admin screens blocked

**4. Test QA Reviewer (Same 36-Screen Checklist)**:
- Verify checklist review access
- Verify sales returns quality check access
- Verify all finance/production screens blocked

**Expected Results**:
✅ **Navigation Menu Filtering**:
- Sidebar shows only permitted screens
- Hidden screens not in DOM (not just CSS hidden)
- No broken links

✅ **Backend API Protection**:
- Direct API calls to restricted endpoints return 403 Forbidden
- Cannot bypass UI restrictions via API
- Server-side validation enforced

✅ **Action-Level Permissions** (CRUD):
- Read-only users: No "Create" / "Edit" / "Delete" buttons
- View-only users: Can see data, cannot modify
- Create-only users: Can add new, cannot edit existing

✅ **Error Handling**:
- Unauthorized access → Clear error message
- User-friendly "Access Denied" page
- Logged to audit trail

✅ **Role Changes Real-Time**:
- Admin changes role permissions
- User's next page load reflects changes
- No system restart required

**Test Status**: ⬜ PENDING

---

### Test Case 6.5: Metadata-Driven Permission UI Testing
**Role**: Admin  
**Objective**: Verify permission system correctly hides/shows UI elements based on metadata  
**Priority**: High

**Pre-requisite**: TC 6.4 - Roles configured

**Steps**:

**1. Test Button Visibility Based on Permissions**:
   - Login as Production Manager
   - Navigate to: Configuration → Products (View permission only)
   - **Expected UI**:
     ```
     Products List Page:
     ✅ Search bar visible
     ✅ Filter dropdown visible
     ✅ Product cards/table visible
     ❌ "Add New Product" button HIDDEN
     ❌ Edit icons HIDDEN
     ❌ Delete buttons HIDDEN
     ```

**2. Test Form Access Based on Permissions**:
   - Click on existing product (to view details)
   - **Expected UI**:
     ```
     Product Detail Page:
     ✅ All fields visible (read-only mode)
     ❌ All input fields DISABLED
     ❌ "Save" button HIDDEN
     ❌ "Delete" button HIDDEN
     ✅ "Back" button visible
     ```

**3. Test Create Permission**:
   - Logout, login as Admin
   - Navigate to same Products page
   - **Expected UI**:
     ```
     Products List Page:
     ✅ "Add New Product" button VISIBLE
     ✅ Edit icons VISIBLE
     ✅ Delete buttons VISIBLE
     ```

**4. Test Mixed Permissions** (Production Manager on Production Entry):
   - Login as Production Manager
   - Navigate to: Production → Production Entry
   - **Expected UI**:
     ```
     Production Entry Page:
     ✅ "New Entry" button VISIBLE (has Create)
     ✅ Edit icons VISIBLE (has Edit)
     ❌ Delete buttons HIDDEN (no Delete permission)
     ✅ Save button enabled
     ```

**5. Test Permission Inheritance on Detail Pages**:
   - Navigate to: Production → Production Reconciliation
   - Click "View Details" on existing reconciliation
   - **Expected UI**:
     ```
     Reconciliation Detail Page:
     ✅ All data visible
     ✅ "Edit" button visible (has Edit permission)
     ❌ "Delete" button hidden (no Delete permission)
     ✅ Export buttons visible (always allowed)
     ```

**6. Test API Endpoint Protection**:
   - Open browser DevTools
   - Try direct API call to restricted endpoint:
     ```javascript
     fetch('/api/users', { method: 'GET' })
     ```
   - **Expected Result**: 
     ```json
     {
       "error": "Access Denied",
       "message": "You don't have permission to access this resource",
       "requiredPermission": "users.read"
     }
     ```

**7. Test Dynamic Menu Generation**:
   - Login as QA Reviewer
   - **Expected Sidebar Menu**:
     ```
     Main:
       - Reviewer Dashboard ✅
     
     Operations:
       - Checklists ✅
       - PM Execution ✅
     
     Production Operations:
       - Sales Returns ✅
     
     [All other sections hidden]
     ```

**Expected Results**:
✅ **UI Metadata-Driven**:
- Permission checks use metadata system
- No hardcoded role checks in components
- Centralized permission logic

✅ **Granular Control**:
- Button-level hiding
- Form field disabling
- Menu item filtering
- Action dropdown filtering

✅ **Consistent Behavior**:
- Same permission logic across all screens
- No UI inconsistencies
- Professional error messages

✅ **Developer Experience**:
- Simple permission checks in code
- Reusable permission components
- Clear permission naming convention

✅ **Security**:
- UI restrictions backed by API validation
- Cannot bypass via browser manipulation
- All actions logged in audit trail

**Permission Check Examples in Code**:
```typescript
// Component-level
{hasPermission('products.create') && (
  <Button>Add Product</Button>
)}

// Hook-based
const canEdit = usePermission('production-entry.edit');

// Metadata-driven
permissions.includes('sales-invoices.view')
```

**Test Status**: ⬜ PENDING

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

### Test Case 9.6: Pending Payments Detail Page with Aging Analysis
**Role**: Manager / Finance  
**Objective**: View detailed pending payments with invoice-wise breakdown and aging analysis  
**Priority**: High

**Steps**:
1. Navigate to: Finance & Sales → Pending Payments (dedicated page)
2. **View Pending Payments Dashboard**:
   
   **Summary Cards**:
   - Total Outstanding: ₹4,56,000
   - Total Overdue (>30 days): ₹1,24,000
   - Customers with Outstanding: 15
   - Average Days Outstanding: 18 days

3. **Invoice-Wise Outstanding Table**:
   
   | Invoice No | Customer | Date | Total | Paid | Outstanding | Days | Status |
   |------------|----------|------|-------|------|-------------|------|--------|
   | INV-2025-001 | XYZ Industries | Jan 10 | ₹59,000 | ₹50,000 | ₹9,000 | 5 | 🟢 Current |
   | INV-2024-125 | ABC Corp | Dec 15 | ₹1,25,000 | ₹75,000 | ₹50,000 | 31 | 🟡 Overdue |
   | INV-2024-098 | DEF Ltd | Nov 20 | ₹85,000 | ₹20,000 | ₹65,000 | 56 | 🔴 Critical |

4. **Apply Filters**:
   - Customer: "All Customers" / specific customer
   - Aging: "All" / "0-15 days" / "16-30 days" / "31-60 days" / "60+ days"
   - Status: "All" / "Current" / "Overdue" / "Critical"
   - Amount Range: ₹10,000 - ₹1,00,000

5. **Click on Invoice** (INV-2024-125):
   - **Payment History Timeline**:
     ```
     Dec 15, 2024 - Invoice Created: ₹1,25,000
     Dec 20, 2024 - Partial Payment: ₹25,000 (Mode: NEFT)
     Dec 28, 2024 - Partial Payment: ₹50,000 (Mode: Cheque)
     Outstanding: ₹50,000
     Days Overdue: 1 day (since Jan 14, 2025)
     ```

6. **Aging Analysis Chart**:
   - Pie chart showing distribution:
     - 0-15 days: ₹2,00,000 (44%)
     - 16-30 days: ₹1,32,000 (29%)
     - 31-60 days: ₹74,000 (16%)
     - 60+ days: ₹50,000 (11%)

7. **Export Options**:
   - Click "Export to Excel"
   - Click "Export to PDF"
   - Click "Send Payment Reminder" (WhatsApp/Email)

**Expected Results**:
✅ **Detailed Invoice Breakdown**:
- Every invoice with outstanding balance shown
- Partial payments clearly tracked
- Real-time outstanding calculation

✅ **Payment History Timeline**:
- Chronological payment record
- Payment modes displayed
- FIFO allocation visible
- Credit note applications shown

✅ **Aging Analysis**:
- Color-coded by age:
  - Green: 0-30 days (current)
  - Yellow: 31-60 days (overdue)
  - Red: 60+ days (critical)
- Automatic categorization
- Visual charts for quick overview

✅ **Customer-Wise Summary**:
- Group by customer
- Total outstanding per customer
- Average payment delay
- Payment behavior analysis

✅ **Action Items**:
- Send payment reminders
- Record new payment directly
- Mark invoice as disputed
- Flag for collection

**Test Status**: ⬜ PENDING

---

### Test Case 9.7: Payment Reminder & Collection Management
**Role**: Manager / Finance  
**Objective**: Send payment reminders and manage collections for overdue invoices  
**Priority**: Medium

**Pre-requisite**: TC 9.6 - Pending Payments page accessed

**Steps**:
1. Navigate to: Finance & Sales → Pending Payments
2. Filter by: "Overdue" (31+ days)
3. **Bulk Select Overdue Invoices**:
   - Select 3 invoices (total outstanding: ₹1,85,000)
   - Customers: ABC Corp, DEF Ltd, GHI Industries

4. **Send Bulk Payment Reminder**:
   - Click "Send Payment Reminder"
   - **Reminder Options**:
     ```
     Reminder Type:
     ○ Gentle Reminder (1st reminder)
     ● Payment Due Notice (2nd reminder)
     ○ Final Notice (3rd reminder)
     
     Send Via:
     ☑ WhatsApp
     ☑ Email
     ☐ SMS
     
     Custom Message:
     "Dear [Customer Name],
     
     This is a friendly reminder that payment for invoice
     [Invoice No] is overdue by [Days] days.
     
     Outstanding Amount: ₹[Amount]
     Due Date: [Due Date]
     
     Please arrange payment at your earliest convenience.
     
     Thank you,
     KINTO Finance Team"
     ```

5. Click "Send Reminders"
6. **System Sends Notifications**:
   - WhatsApp messages sent to all 3 customers
   - Emails sent with PDF invoices attached
   - Reminder logged in system

7. **Track Reminder History**:
   - For invoice INV-2024-125:
     ```
     Reminder History:
     Jan 10, 2025 - Gentle Reminder sent (Email)
     Jan 15, 2025 - Payment Due Notice sent (WhatsApp + Email)
     
     Next Action: Final Notice (scheduled: Jan 22)
     ```

8. **Mark for Collection**:
   - Click "Flag for Collection" on invoice INV-2024-098
   - **Collection Details**:
     ```
     Collection Status: Flagged
     Assigned To: Collection Agent
     Priority: High
     Follow-up Date: Jan 18, 2025
     Notes: "Customer requested installment plan"
     ```

**Expected Results**:
✅ **Automated Reminders**:
- Bulk send to multiple customers
- Multi-channel delivery (WhatsApp, Email, SMS)
- Template-based with dynamic fields
- Professional formatting

✅ **Reminder Tracking**:
- Complete reminder history
- Number of reminders sent
- Customer response tracked
- Escalation path (gentle → due notice → final notice)

✅ **Collection Management**:
- Flag high-priority invoices
- Assign to collection agents
- Set follow-up dates
- Add collection notes
- Track collection efforts

✅ **Smart Automation**:
- Auto-escalate after X days without payment
- Schedule follow-up reminders
- Notify manager of critical cases
- Integration with payment recording

✅ **Compliance**:
- Audit trail of all reminders
- Customer communication history
- Dispute resolution tracking
- Legal notice preparation (if needed)

**Collection Workflow**:
```
Day 0: Invoice created
Day 15: Gentle reminder (auto)
Day 30: Payment due notice (auto)
Day 45: Final notice (auto)
Day 60: Flag for collection → Manual follow-up
Day 90: Legal action consideration
```

**Test Status**: ⬜ PENDING

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

## 16. System Fixes & Updates (November 2025)

### Test Case 16.1: Authentication Session Persistence Fix
**Role**: All Users  
**Objective**: Verify session cookies persist correctly after login  
**Issue Fixed**: Session cookies were not being set properly, causing users to appear logged out on page refresh

**Steps**:
1. Navigate to login page
2. Enter credentials:
   - Username: "admin"
   - Password: "password"
3. Click "Login"
4. Verify user is redirected to dashboard
5. Check browser DevTools → Application → Cookies
6. Verify `connect.sid` cookie is present
7. Refresh the page (F5)
8. Navigate to different pages
9. Close browser tab and reopen
10. Navigate to app URL

**Expected Result**:
- `connect.sid` cookie is set with correct attributes:
  - sameSite: "lax"
  - secure: false (development) / true (production)
  - httpOnly: true
- User remains authenticated after page refresh
- Session persists across browser tabs
- User stays logged in for 7 days (default session duration)
- All API requests include authentication cookie automatically

**Technical Fix Applied**:
- Changed `req.session.save()` to `req.session.regenerate()` in login endpoint
- This forces proper Set-Cookie header generation
- Session config updated to use correct cookie settings for Replit environment

**Test Status**: ✅ PASSED (Fixed on Nov 12, 2025)

---

### Test Case 16.2: Product Master Tab Navigation Fix
**Role**: Admin / Manager  
**Objective**: Verify all 4 product tabs are clickable and functional  
**Issue Fixed**: Product Master tabs (Product Info, Packaging, Pricing/Tax, BOM) were not clickable due to CSS pointer-events conflict

**Steps**:
1. Login as Admin
2. Navigate to: Admin → Production → Products
3. Click "Add Product" or edit existing product
4. **Test Tab Navigation**:
   - Click "Product Info" tab
   - Verify tab content loads instantly
   - Verify tab is visually highlighted (active state)
   - Click "Packaging" tab
   - Verify tab switches and content loads
   - Click "Pricing/Tax" tab
   - Verify tab switches and content loads
   - Click "BOM" tab
   - Verify tab switches and content loads
5. Switch between tabs multiple times rapidly
6. Fill in data in "Product Info" tab
7. Switch to "BOM" tab
8. Switch back to "Product Info" tab
9. Verify filled data persists

**Expected Result**:
- All 4 tabs are clickable
- Tab content switches instantly without delay
- Active tab is visually highlighted
- No JavaScript errors in console
- Form data persists when switching between tabs
- No layout shifts or visual glitches
- Tabs work on both desktop and mobile/touch devices

**Technical Fix Applied**:
- Removed conflicting `pointer-events-auto` CSS classes from tab components
- Tabs now use browser's default event handling
- Dialog overlay no longer blocks tab interactions

**Test Status**: ✅ PASSED (Fixed on Nov 12, 2025)

---

### Test Case 16.3: Credit Notes Approval Workflow Fix
**Role**: Manager / Admin  
**Objective**: Verify credit note approval tracking works correctly  
**Issue Fixed**: Missing `approved_by` column in `credit_notes` table prevented proper approval workflow tracking

**Steps**:
1. **Create Sales Return**:
   - Login as Manager
   - Navigate to: Finance → Sales Returns
   - Create a sales return for an invoice
   - Complete quality segregation
2. **Verify Credit Note Generation**:
   - Navigate to: Finance → Credit Notes
   - Find auto-generated credit note (for same-month returns)
3. **Check Approval Information**:
   - Open credit note details
   - Verify "Approved By" field is present
   - For auto-generated credit notes, verify system user is recorded
   - For manual credit notes, verify approving user's name is shown
4. **Test Manual Approval** (if applicable):
   - Create a credit note that requires manual approval
   - Approve the credit note
   - Verify `approved_by` field updates with current user's information
5. **Database Verification**:
   - Query: `SELECT id, invoice_id, approved_by FROM credit_notes`
   - Verify `approved_by` column exists and contains data

**Expected Result**:
- `approved_by` column exists in `credit_notes` table
- Column stores user ID or username who approved the credit note
- Auto-generated credit notes show system approval
- Manual approvals record the approving user
- Credit note reports include approval information
- Audit trail is complete for compliance

**Technical Fix Applied**:
- Added `approved_by VARCHAR` column to `credit_notes` table
- Migration script created: `20251112_150000_add_credit_notes_approved_by.sql`
- Column includes database comment for documentation
- Used `ADD COLUMN IF NOT EXISTS` for safe migration

**Database Migration**:
```sql
ALTER TABLE credit_notes 
ADD COLUMN IF NOT EXISTS approved_by VARCHAR;

COMMENT ON COLUMN credit_notes.approved_by IS 
'User ID or name of the person who approved this credit note';
```

**Test Status**: ✅ PASSED (Fixed on Nov 12, 2025)

---

## Bug Fix Summary (November 2025)

| Bug ID | Test Case | Severity | Status | Fix Date | Migration Script |
|--------|-----------|----------|--------|----------|------------------|
| BUG-001 | TC-16.1 | Critical | ✅ FIXED | 2025-11-12 | N/A (Code change) |
| BUG-002 | TC-16.2 | Critical | ✅ FIXED | 2025-11-12 | N/A (Code change) |
| BUG-003 | TC-16.3 | High | ✅ FIXED | 2025-11-12 | 20251112_150000_add_credit_notes_approved_by.sql |

---

## 17. Product Master with BOM Management

### Test Case 17.1: Create Product with Complete BOM (Multi-Tab Form)
**Role**: Admin / Manager  
**Objective**: Create a new product using all 4 tabs with complete BOM definition  
**Priority**: Critical

**Steps**:

**Tab 1: Product Info**
1. Login as Admin
2. Navigate to: Admin → Production → Products
3. Click "Add Product" button
4. Fill Product Info tab:
   - Product Code: "PROD-1L-PET"
   - Product Name: "1 Liter PET Bottle Water"
   - SKU Code: "SKU-1L-001"
   - Category: Select "Beverages" (from Product Category dropdown)
   - Type: Select "Bottled Water" (from Product Type dropdown)
   - Description: "1L packaged drinking water in PET bottle"

**Tab 2: Packaging**
5. Click "Packaging" tab
6. Fill packaging details:
   - Base Unit: "Bottle"
   - Derived Unit: "Case"
   - Conversion Method: Select "Direct Value"
   - Derived Value Per Base: 24 (24 bottles per case)
   - Net Volume: 1000 (ml)

**Tab 3: Pricing/Tax**
7. Click "Pricing/Tax" tab
8. Fill pricing details:
   - Base Price: ₹20.00
   - GST Percent: 18%
   - Total Price: Auto-calculated (₹23.60)
   - HSN Code: "2201"
   - Tax Type: "GST"

**Tab 4: BOM (Bill of Materials)**

> **🔗 CRITICAL**: BOM uses **Raw Materials** (which are linked to **Raw Material Types** with conversion formulas). This enables automatic quantity calculations during BOM-driven issuance (TC 20.1).

9. Click "BOM" tab
10. Click "Add Row" to add BOM items:
    - **Row 1:**
      - **Raw Material**: "Preform 21g Transparent"
        - *(Linked to Raw Material Type: "Preform" with conversion: 1 Bag = 25kg = 1190 pieces)*
      - Quantity Required: 1 piece per bottle
      - UOM: "Piece"
      - Notes: "Main bottle body"
    - **Row 2:**
      - **Raw Material**: "Cap 28mm White"
        - *(Linked to Raw Material Type: "Cap" with conversion: 1 Bag = 5kg = 2500 pieces)*
      - Quantity Required: 1 piece per bottle
      - UOM: "Piece"
      - Notes: "Bottle cap"
    - **Row 3:**
      - **Raw Material**: "Label Adhesive"
        - *(Linked to Raw Material Type: "Adhesive" with conversion: 1 Bag = 25kg)*
      - Quantity Required: 0.5 grams per bottle
      - UOM: "Gram"
      - Notes: "Label glue"
11. Click "Save"

**Expected Results**:
✅ **Product Created Successfully**:
- Product saved with code: PROD-1L-PET
- All 4 tabs are accessible and clickable
- Tab navigation works smoothly

✅ **BOM Configured**:
- **3 raw materials added** to BOM
- Each raw material **inherits conversion formula** from its Raw Material Type
- Quantity requirements defined (1 preform, 1 cap, 0.5g adhesive per bottle)
- **BOM ready for auto-populate** in Raw Material Issuance (TC 20.1)

✅ **Conversion Chain Established**:
```
Product BOM → Raw Materials → Raw Material Types → Conversion Formulas
Example Flow:
1. Product: "1 Liter PET Bottle Water" (BOM defined)
2. BOM Item: "Preform 21g Transparent" (raw material)
3. Type Link: "Preform" type (conversion: 25kg/bag, 21g/piece)
4. Auto-Calculation: Produce 1000 bottles → Need 1000 preforms
   → Calculate: 1000 ÷ 1190 = 0.84 bags → 21 kg
```
- Product appears in products list
- BOM items are saved and linked to product
- When editing product, all BOM items are retrieved and displayed
- Total of 3 BOM items shown in BOM tab
- Product can be selected in production/issuance screens

**Test Data**:
- Product: PROD-1L-PET
- BOM Items: 3 (Preform, Cap, Label Adhesive)
- Conversion: 24 bottles per case

**Test Status**: ⬜ PENDING

---

### Test Case 17.2: Edit Product BOM (Atomic Replacement)
**Role**: Admin / Manager  
**Objective**: Verify BOM can be edited and replaced atomically  
**Priority**: High

**Steps**:
1. Open existing product: "1 Liter PET Bottle Water"
2. Click "Edit" button
3. Navigate to "BOM" tab
4. Modify existing BOM:
   - Update Row 1 quantity from 1 to 1.2 (add 20% safety margin)
   - Delete Row 3 (Label Adhesive)
   - Add new Row: "Shrink Film" - Qty: 0.3, UOM: "Meter"
5. Click "Save"

**Expected Results**:
- Old BOM items are completely replaced (not appended)
- New BOM has exactly 3 items:
  - Preform 21g: 1.2 pieces
  - Cap 28mm: 1 piece
  - Shrink Film: 0.3 meter
- Label Adhesive is removed
- Raw material issuance reflects updated BOM quantities

**Test Status**: ⬜ PENDING

---

### Test Case 17.3: Create Product with Empty BOM
**Role**: Admin  
**Objective**: Verify products can be created without BOM items  
**Priority**: Medium

**Steps**:
1. Create new product: "Generic Product"
2. Fill Product Info, Packaging, and Pricing tabs
3. Navigate to BOM tab
4. Leave BOM tab empty (no rows added)
5. Click "Save"

**Expected Results**:
- Product created successfully
- Product has zero BOM items
- No errors when BOM is empty
- Product can still be used in system
- Warning shown when trying to use in BOM-driven issuance

**Test Status**: ⬜ PENDING

---

## 18. Raw Material Type Master with Auto-Fetch

### Test Case 18.1: Create Raw Material Type (Formula-Based Conversion)
**Role**: Admin  
**Objective**: Create a raw material type with formula-based conversion  
**Priority**: Critical

**Steps**:
1. Login as Admin
2. Navigate to: Admin → Configuration → Raw Material Types
3. Click "Add Raw Material Type"
4. Fill in details:
   - Type Code: Auto-generated (RMT-001)
   - Type Name: "Preform"
   - Conversion Method: "Formula-Based"
   - Base Unit: "Bag"
   - Base Unit Weight: 25 (kg)
   - Derived Unit: "Piece"
   - Weight Per Derived Unit: 21 (grams)
   - Loss Percent: 2%
5. Click "Save"

**Expected Results**:
✅ **Type Created Successfully**:
- Type saved with code: RMT-001
- **Conversion Value** auto-calculated: 25,000g ÷ 21g = 1190 pieces/bag
- **Usable Units** auto-calculated: 1190 × (1 - 0.02) = **1166 pieces/bag**
- Type appears in dropdown when creating raw materials

✅ **Loss Percentage Impact Chain**:

**1. At Raw Material Type Level:**
```
Theoretical Conversion: 25kg ÷ 21g = 1190 pieces/bag
Loss Percentage: 2% (accounts for breakage, defects, handling loss)
Usable Units: 1190 × 0.98 = 1166 pieces/bag
```

**2. During Raw Material Issuance (TC 20.1):**
```
Planned Output: 1000 bottles
BOM Requirement: 1 preform per bottle
Expected Need: 1000 pieces

LOSS-ADJUSTED CALCULATION:
Suggested Issuance = 1000 ÷ 1166 × 1190 = 1020 pieces
(System increases quantity to account for 2% expected loss)
```

**3. During Production Reconciliation (TC 22.1):**
```
Issued: 1020 pieces
Actual Production: 1000 bottles
Expected Consumption: 1000 pieces (based on actual output)
Returned: 20 pieces (unused material)
Net Consumed: 1020 - 20 = 1000 pieces

Variance Calculation:
- Net Consumed: 1000 pieces
- Expected: 1000 pieces  
- Variance: 0% ✅ (Perfect - actual loss matched expected loss)

If Net Consumed was 1040 pieces:
- Variance: (1040 - 1000) / 1000 = +4% ⚠️ (Excess wastage)
```

**Calculation Verification**:
- 25kg bag = 25,000 grams
- Each preform = 21 grams
- Theoretical pieces/bag = 1190
- **Loss adjustment ensures accurate material planning**
- Theoretical pieces = 25,000 ÷ 21 = 1190
- With 2% loss = 1190 × 0.98 = 1166 usable pieces

**Test Status**: ⬜ PENDING

---

### Test Case 18.2: Create Raw Material with Type Auto-Fetch
**Role**: Admin / Manager  
**Objective**: Verify Raw Material Type details auto-populate when selected  
**Priority**: Critical

**Steps**:
1. Navigate to: Admin → Production → Raw Materials
2. Click "Add Raw Material"
3. Enter Material Name: "Preform 21g Transparent"
4. **Select Material Type: "Preform"** (from dropdown)
5. **Verify Auto-Populated Fields**:
   - Base Unit: "Bag" (read-only, greyed out)
   - Usable Units: "1166 pcs per bag" (read-only)
   - Conversion Method: "Formula-Based" (read-only)
   - Loss %: "2%" (read-only)
6. Select Category: "Preforms"
7. Enter Description: "21g transparent PET preform"
8. **Stock Management Section**:
   - Toggle "Opening Stock Only": ON
   - Opening Stock: 50 bags
   - Opening Date: Today
9. Click "Save"

**Expected Results**:
- Type Master details auto-fetch instantly upon selection
- All conversion fields are read-only (not editable)
- Base Unit displays correctly
- Usable Units displays with units (e.g., "1166 pcs per bag")
- Conversion Method shows correctly
- Loss % shows correctly
- Opening Stock is saved: 50 bags
- **Closing Stock** calculated: 50 bags
- **Closing Stock Usable** calculated: 50 × 1166 = 58,300 pieces

**Test Status**: ⬜ PENDING

---

### Test Case 18.3: Raw Material Stock Management - Ongoing Inventory Mode
**Role**: Manager  
**Objective**: Verify raw material inventory calculations in Ongoing Inventory mode  
**Priority**: High

**Steps**:
1. Create new raw material: "Cap 28mm White"
2. Select Type: "Cap" (Direct Value conversion)
3. **Stock Management Section**:
   - Toggle "Opening Stock Only": OFF (Ongoing Inventory mode)
   - Opening Stock: 100 boxes
   - Received Quantity: 50 boxes
   - Returned Quantity: 10 boxes
   - Adjustments: -5 boxes
4. Click "Save"

**Expected Results**:
- **Closing Stock** calculated: 100 + 50 - 10 - 5 = 135 boxes
- **Closing Stock Usable** calculated: 135 × (usable units per box)
- Formula displayed or documented
- Stock mode set to "Ongoing Inventory"
- All transactions reflected in inventory

**Test Status**: ⬜ PENDING

---

## 19. Product Category & Type Master Data Management

### Test Case 19.1: Create Product Category
**Role**: Admin  
**Objective**: Create a new product category  
**Priority**: High

**Steps**:
1. Navigate to: Admin → Configuration → Product Categories
2. Click "Add Category"
3. Fill in:
   - Code: "BEV"
   - Name: "Beverages"
   - Description: "All beverage products"
   - Is Active: Yes
4. Click "Save"

**Expected Results**:
- Category created successfully
- Appears in Product Category dropdown when creating products
- Can be edited and deleted
- Display order managed correctly

**Test Status**: ⬜ PENDING

---

### Test Case 19.2: Create Product Type
**Role**: Admin  
**Objective**: Create a new product type  
**Priority**: High

**Steps**:
1. Navigate to: Admin → Configuration → Product Types
2. Click "Add Type"
3. Fill in:
   - Code: "BTL-WATER"
   - Name: "Bottled Water"
   - Description: "Packaged drinking water"
   - Is Active: Yes
4. Click "Save"

**Expected Results**:
- Type created successfully
- Appears in Product Type dropdown
- Full CRUD operations work

**Test Status**: ⬜ PENDING

---

## 20. BOM-Driven Raw Material Issuance (PRIMARY WORKFLOW)

> **🎯 This is the PRIMARY workflow** for raw material issuance in production scenarios. For edge cases (products without BOM, ad-hoc materials), see **TC 4.2: Manual/Ad-hoc Issuance**.

### Test Case 20.1: Issue Raw Materials with BOM Auto-Populate (Using Type Conversions)
**Role**: Manager / Operator  
**Objective**: Verify BOM items auto-populate with intelligent quantity calculations using the conversion chain  
**Priority**: Critical  
**Status**: ✅ COMPLETED (November 2025)

> **🔗 CONVERSION CHAIN**: This workflow leverages the full conversion chain:
> ```
> Product BOM → Raw Materials → Raw Material Types → Conversion Formulas → Auto-Calculated Quantities
> ```

**Pre-requisite**: 
- Product with BOM defined (TC 17.1)
- BOM items are raw materials
- Raw materials linked to raw material types with conversion formulas (TC 18.1, TC 4.1)

**Steps**:
1. Navigate to: Production → Raw Material Issuance
2. Click "Issue Material" button
3. Fill header details:
   - Issuance Date: Today
   - **Product**: Select "1 Liter PET Bottle Water" (has 3-item BOM from TC 17.1)
   - Issued To: "Production Line 1"
   - **Planned Output**: 1000 bottles
4. **Verify BOM Auto-Populate with Type Conversions**:
   - System automatically populates all 3 BOM items
   - Toast notification: "BOM Loaded - 3 materials auto-populated"
   - **Intelligent calculations using conversion chain**:
     
     **Row 1: Preform 21g Transparent**
     - BOM Requirement: 1 piece per bottle
     - Planned Output: 1000 bottles
     - **Conversion Chain**:
       1. Raw Material: "Preform 21g Transparent"
       2. Linked Type: "Preform" (25kg/bag, 21g/piece = 1190 pieces/bag)
       3. Calculation: 1000 bottles × 1 piece = 1000 pieces
       4. **Auto-populated Qty**: 1000 pieces (or 0.84 bags, or 21 kg)
     
     **Row 2: Cap 28mm White**
     - BOM Requirement: 1 piece per bottle
     - Planned Output: 1000 bottles
     - **Conversion Chain**:
       1. Raw Material: "Cap 28mm White"
       2. Linked Type: "Cap" (5kg/bag, 2g/piece = 2500 pieces/bag)
       3. Calculation: 1000 bottles × 1 piece = 1000 pieces
       4. **Auto-populated Qty**: 1000 pieces (or 0.4 bags, or 2 kg)
     
     **Row 3: Label Adhesive**
     - BOM Requirement: 0.5 grams per bottle
     - Planned Output: 1000 bottles
     - **Conversion Chain**:
       1. Raw Material: "Label Adhesive"
       2. Linked Type: "Adhesive" (25kg/bag)
       3. Calculation: 1000 bottles × 0.5g = 500g
       4. **Auto-populated Qty**: 500 grams (or 0.5 kg)

5. **User can**:
   - View suggested quantities (calculated from BOM + Type conversions)
   - Modify quantities if needed
   - Add additional off-BOM items using "Add off-BOM Item" button
6. Click "Create Issuance"

**Expected Results**:
✅ **BOM Auto-Populate**:
- All 3 BOM items auto-populate based on production quantity
- Quantities calculated using **conversion formulas from Raw Material Types**
- Calculation method indicator shown (Formula-Based, Direct-Value, Output-Coverage)

✅ **Conversion Chain Working**:
- System traverses: Product BOM → Raw Materials → Raw Material Types → Formulas
- Accurate quantity calculations based on conversion ratios
- Loss percentage applied if configured (e.g., 2% wastage)

✅ **User Flexibility**:
- Can add additional items not in BOM
- Can modify auto-populated quantities
- Can specify issuance in any unit (pieces, bags, kg) - system converts automatically

✅ **Inventory & Tracking**:
- Issuance saved successfully (no validation errors)
- Raw material inventory deducted (in base UOM: kg)
- Issuance appears in issuance list
- Calculation basis tracked for audit trail

**Calculation Methods** (Based on Raw Material Type):
1. **Formula-Based**: Bag weight ÷ piece weight = pieces/bag (e.g., Preform: 25kg ÷ 0.021kg = 1190 pieces)
2. **Direct-Value**: User-defined conversion (e.g., 1 Box = 100 pieces)
3. **Output-Coverage**: Material covers X units of output (e.g., 1 Roll = 500 labels)

**Cross-References**:
- TC 17.1 - Product Master creates BOM with raw materials
- TC 18.1 - Raw Material Type defines conversion formulas
- TC 4.1 - Raw Materials linked to Types
- TC 18.2 - Type details auto-fetch on material selection

**Test Status**: ✅ **COMPLETED** - All scenarios verified

---

### Test Case 20.2: Issue Materials for Product Without BOM (Fallback to Manual)
**Role**: Manager  
**Objective**: Handle material issuance when product has no BOM defined  
**Priority**: Medium

> **Note**: This scenario automatically falls back to manual entry. See **TC 4.2** for detailed manual issuance workflow.

**Steps**:
1. Navigate to: Production → Raw Material Issuance
2. Click "Issue Material"
3. Select product without BOM: "Generic Product"
4. Enter Planned Output (optional)
5. Verify no items auto-populate
6. Click "Add off-BOM Item" to manually add raw materials
7. Save issuance

**Expected Results**:
- No auto-populate occurs (product has no BOM)
- Items table is empty, ready for manual entry
- User can manually add any raw materials
- Issuance works normally (falls back to TC 4.2 workflow)
- Calculation basis marked as "manual"

**Test Status**: ⬜ PENDING

---

## 21. Production Entry with Variance Analysis

### Test Case 21.1: Create Production Entry with Auto Finished Goods Creation
**Role**: Operator / Manager  
**Objective**: Record production output with automatic finished goods creation and variance tracking  
**Priority**: Critical

> **🔄 KEY FEATURE**: This workflow **automatically creates finished goods** with `pending` status. No manual entry required!

**Steps**:
1. Navigate to: Production → Production Entries
2. Click "Add Production Entry"
3. Fill details:
   - Production Date: Today
   - **Link to Raw Material Issuance**: Select issuance (e.g., "RM-2025-001")
     - System auto-fills Product and Planned Output from issuance
   - Shift: "Day Shift" (A, B, or General)
   - Machine: "Blow Molding Machine 01" (optional)
   - **Actual Produced Quantity**: 950 bottles
   - Rejected Quantity: 30 bottles
   - Empty Bottles Produced: 0 (optional)
   - Empty Bottles Used: 0 (optional)
   - Remarks: "Machine stoppage for 30 mins due to power fluctuation"
4. Click "Create Production Entry"

**Expected Results**:
✅ **Production Entry Created**:
- Production entry saved successfully
- Linked to raw material issuance
- Shift-wise tracking enabled

✅ **Variance Analysis** (Automatic):
- Expected (from issuance): 1000 bottles
- Actual Produced: 950 bottles
- Variance: -50 bottles (-5%)
- Formula: (950 - 1000) / 1000 × 100 = -5%
- **Variance displayed in RED** (negative variance indicator)

✅ **Finished Goods Auto-Created** (Automatic):
- **Batch Number**: Auto-generated as `RM-2025-001-2025-11-13-Day Shift`
- **Quality Status**: `pending` (awaiting approval)
- **Quantity**: 950 bottles (actual produced, not planned)
- **Product**: Auto-linked from issuance
- **Production Date**: From production entry
- **Remarks**: Auto-generated as "Auto-generated from Production Entry [ID]. Shift: Day Shift"
- **Inventory**: NOT updated yet (requires quality approval - see TC 21.2)

✅ **System Behavior**:
- Finished goods appear in Finished Goods list with `pending` badge
- Cannot be invoiced until approved
- Quality inspector notified for approval

**Verification Steps**:
1. Navigate to: Inventory → Finished Goods
2. Verify new batch appears with status: `pending`
3. Verify batch number format: `IssuanceNumber-Date-Shift`
4. Verify quantity matches actual produced (not planned)

**Test Status**: ⬜ PENDING

---

### Test Case 21.2: Quality Approval of Finished Goods
**Role**: Quality Inspector / Manager  
**Objective**: Approve finished goods for sale after production  
**Priority**: Critical

> **🔑 REQUIRED STEP**: Finished goods must be approved before they can be invoiced/sold!

**Pre-requisite**: TC 21.1 completed - Finished goods exist with `pending` status

**Steps**:
1. Navigate to: Inventory → Finished Goods
2. Filter by Status: "Pending"
3. Find batch: "RM-2025-001-2025-11-13-Day Shift" (950 bottles)
4. Click "Inspect/Approve" button
5. Review details:
   - Product: 1 Liter PET Bottle Water
   - Quantity: 950 bottles
   - Production Date: Today
   - Shift: Day Shift
   - Rejected in Production: 30 bottles
6. Perform quality inspection (visual check, sampling, etc.)
7. Select Quality Status: "Approved" (or "Rejected" if fails)
8. Add inspection remarks: "Quality check passed. Ready for dispatch"
9. Click "Update Status"

**Expected Results**:
✅ **Quality Status Updated**:
- Status changed from `pending` → `approved`
- Inspector name and date recorded
- Goods now appear in "Available for Sale" list

✅ **Inventory Availability**:
- Finished goods NOW available for invoicing
- Shows in product selection dropdown for sales invoices
- Stock level visible to sales team

✅ **System Behavior**:
- Cannot invoice `pending` goods (validation error)
- Only `approved` goods selectable in invoice form
- Batch tracking maintained throughout workflow

**Rejection Workflow** (if quality fails):
1. Select Status: "Rejected"
2. Add remarks: "Defects found in sealing"
3. Rejected goods removed from saleable inventory
4. Marked for rework or disposal

**Test Status**: ⬜ PENDING

---

### Test Case 21.3: Production Entry with Positive Variance
**Role**: Operator  
**Objective**: Verify positive variance handling  
**Priority**: High

**Steps**:
1. Create production entry:
   - Expected: 1000 bottles
   - Actual Produced: 1050 bottles
   - Rejected: 20 bottles
2. Save entry

**Expected Results**:
- Variance: +50 bottles (+5%)
- **Variance displayed in GREEN** (positive variance)
- Good production efficiency indicator
- Finished goods: 1050 bottles auto-created with pending status

**Test Status**: ⬜ PENDING

---

## 22. Production Reconciliation Entry System

> **📊 LOSS PERCENTAGE FLOW - COMPLETE SYSTEM OVERVIEW**
>
> Loss percentage in Raw Material Type flows through the entire production cycle:
>
> ```
> STEP 1: Raw Material Type Configuration (TC 18.1)
> ┌─────────────────────────────────────────────────────────┐
> │ Type: "Preform"                                         │
> │ Conversion: 25kg ÷ 21g = 1190 pieces/bag               │
> │ Loss Percentage: 2%                                     │
> │ ➜ Usable Units: 1190 × 0.98 = 1166 pieces/bag         │
> └─────────────────────────────────────────────────────────┘
>          ↓
> STEP 2: Raw Material Issuance with BOM Auto-Populate (TC 20.1)
> ┌─────────────────────────────────────────────────────────┐
> │ Planned Output: 1000 bottles                           │
> │ BOM Requirement: 1 preform per bottle                  │
> │                                                         │
> │ LOSS-ADJUSTED CALCULATION:                             │
> │ Need: 1000 pieces                                      │
> │ Suggested Qty: 1000 ÷ 1166 × 1190 = 1020 pieces       │
> │ (System adds 20 extra pieces for 2% expected loss)     │
> │                                                         │
> │ ✅ Issued: 1020 pieces                                 │
> │ ✅ Inventory deducted: 1020 pieces                     │
> └─────────────────────────────────────────────────────────┘
>          ↓
> STEP 3: Production Entry (TC 21.1)
> ┌─────────────────────────────────────────────────────────┐
> │ Actual Production: 1000 bottles produced               │
> │ Finished Goods Created: 1000 bottles (pending QA)      │
> └─────────────────────────────────────────────────────────┘
>          ↓
> STEP 4: Production Reconciliation (TC 22.1)
> ┌─────────────────────────────────────────────────────────┐
> │ CALCULATION:                                            │
> │ • Issued: 1020 pieces                                  │
> │ • Expected Consumption: 1000 pieces (actual output)    │
> │ • Returned: 20 pieces (unused material)                │
> │ • Net Consumed: 1020 - 20 = 1000 pieces               │
> │                                                         │
> │ VARIANCE ANALYSIS:                                      │
> │ Variance = (1000 - 1000) / 1000 × 100 = 0% ✅         │
> │ Status: GREEN (Perfect - actual matched expected)      │
> │                                                         │
> │ INVENTORY UPDATE:                                       │
> │ • Raw material inventory +20 pieces (returned)         │
> └─────────────────────────────────────────────────────────┘
>
> **KEY INSIGHTS**:
> - Loss percentage is configured ONCE at Raw Material Type level
> - System automatically accounts for loss during issuance
> - Reconciliation variance shows if ACTUAL loss exceeded EXPECTED loss
> - 0% variance = Actual loss matched the configured 2% loss
> - Positive variance = Excess wastage (needs investigation)
> - Negative variance = Better than expected efficiency
> ```

## 22. Production Reconciliation Entry System

### Test Case 22.1: Complete Production Reconciliation (with Loss Percentage Impact)
**Role**: Manager / Supervisor  
**Objective**: Reconcile raw material consumption with actual production and understand loss percentage impact  
**Priority**: Critical

> **🔗 LOSS PERCENTAGE IMPACT**: Loss percentage from Raw Material Type affects Expected Consumption calculations:
> ```
> Raw Material Type (2% loss) → Usable Units = 1166 pcs/bag (not 1190)
> → Expected Consumption accounts for this loss
> → Variance shows if ACTUAL wastage exceeded EXPECTED wastage
> ```

**Steps**:
1. **Prerequisites**:
   - **Raw Material Type** configured with loss percentage:
     - Type: "Preform" 
     - Conversion: 25kg ÷ 21g = 1190 pieces/bag
     - **Loss Percent: 2%**
     - **Usable Units: 1190 × 0.98 = 1166 pieces/bag**
   - Raw Material Issuance exists (1200 Preforms issued)
   - Production Entry exists (950 bottles actually produced)
   
2. Navigate to: Production Operations → Production Reconciliation
3. Click "Add Reconciliation"
4. Fill header:
   - Date: Today
   - Shift: "Day Shift"
   - Product: "1 Liter PET Bottle Water"
   - **Link Raw Material Issuance**: Select issuance (1200 preforms)
   - **Link Production Entry**: Select production entry (950 bottles)
   
5. **System Auto-Displays Itemized Breakdown with Loss Calculations**:
   
   **Preform 21g (Type has 2% loss percentage):**
   - **Issued**: 1200 pieces
   - **Expected Consumption**: 950 pieces
     - *Calculation*: Actual Production (950) × BOM Qty (1 piece/bottle) = 950 pieces
     - *Note*: Loss percentage already factored into issuance quantity, not expected consumption
   - **Returned**: 250 pieces (entered by user)
   - **Net Consumed**: 1200 - 250 = 950 pieces (auto-calculated)
   - **Variance**: (950 - 950) / 950 = 0% ✅ (perfect match)
   
   **Cap 28mm (Type has 1% loss percentage):**
   - **Issued**: 1000 pieces
   - **Expected Consumption**: 950 pieces
   - **Returned**: 50 pieces
   - **Net Consumed**: 1000 - 50 = 950 pieces
   - **Variance**: 0% ✅
   
6. **Enter Returned Materials** (if any):
   - Preform 21g: 250 pieces returned (unused material)
   - Cap 28mm: 50 pieces returned
7. Click "Save Reconciliation"

**Expected Results**:
✅ **Reconciliation Created Successfully**:
- Reconciliation saved with linked issuance and production
- All calculations accurate

✅ **Loss Percentage Understanding**:
- **During Issuance** (TC 20.1): Loss percentage increases suggested quantity
  - Example: Need 950 pieces → System suggests 1200 to account for 2% loss
- **During Reconciliation**: Expected = Actual Production × BOM Quantity
  - Expected: 950 pieces (based on actual output, not suggested issuance)
  - If Net Consumed = 950, Variance = 0% (loss was within expected range)
  - If Net Consumed = 1000, Variance = +5.3% (excess wastage, needs investigation)

✅ **Calculations**:
- **Net Consumed** = Issued - Returned (dynamic calculation)
- **Variance %** = (Net Consumed - Expected) / Expected × 100
- **Color-coded variance indicators**:
  - Green: Within tolerance (0-2%) - Normal operational loss
  - Yellow: Moderate variance (2-5%)
  - Red: High variance (>5%)
- **Returned materials update raw material inventory**
  - Preform inventory +250 pieces
  - Cap inventory +50 pieces
- **Audit trail created**:
  - User who created reconciliation
  - Timestamp
  - Original vs updated quantities
- **Composite unique index enforced**: Cannot create duplicate reconciliation for same date/shift/product
- **Data integrity maintained**

**Test Status**: ⬜ PENDING

---

### Test Case 22.2: Reconciliation with High Variance (Material Wastage)
**Role**: Manager  
**Objective**: Handle high variance due to material wastage  
**Priority**: High

**Steps**:
1. Create reconciliation:
   - Issued: 1200 Preforms
   - Expected: 950 pieces (based on production)
   - Returned: 150 pieces
   - **Net Consumed**: 1200 - 150 = 1050 pieces
   - **Variance**: (1050 - 950) / 950 = +10.5%
2. Add remarks: "High wastage due to defective raw material batch"
3. Save reconciliation

**Expected Results**:
- **High variance flagged in RED** (>5%)
- Manager alert triggered
- Variance displayed: +10.5% (100 pieces excess consumption)
- Requires investigation/approval
- Wastage recorded for analytics

**Test Status**: ⬜ PENDING

---

### Test Case 22.3: Role-Based Edit Limits
**Role**: Operator vs Manager  
**Objective**: Verify role-based permissions for reconciliation editing  
**Priority**: High

**Steps**:
1. **As Operator**:
   - Create reconciliation
   - Try to edit after 2 hours
   - Verify: Edit DENIED (operator can only edit within 1 hour)
2. **As Manager**:
   - Try to edit same reconciliation after 2 hours
   - Verify: Edit ALLOWED (manager has extended edit window)

**Expected Results**:
- Operator: Edit blocked after time limit
- Manager: Can edit with extended permissions
- Error message shown: "Edit time limit exceeded for your role"
- Server-side validation enforced (not just UI)

**Test Status**: ⬜ PENDING

---

### Test Case 22.4: Generate Production Reconciliation Report (Excel)
**Role**: Manager / Admin  
**Objective**: Export production reconciliation data to Excel with itemized breakdown  
**Priority**: High

**Pre-requisite**: TC 22.1 completed - Reconciliation entry created

**Steps**:
1. Navigate to: Production Operations → Production Reconciliation
2. Find reconciliation: Date: 2025-01-15, Shift: Day, Product: 1L Water Bottle
3. Click "Export to Excel" button
4. **Excel Download Starts**

**Excel File Contents**:

**Sheet 1: Reconciliation Header**
- Company branding (KINTO logo/header)
- Reconciliation Number: RC-2025-001
- Date: 2025-01-15
- Shift: Day Shift
- Product: 1 Liter PET Bottle Water
- Linked Issuance: ISS-2025-010
- Linked Production: PROD-2025-025
- Actual Production: 950 bottles
- Created By: Manager Name
- Created At: 2025-01-15 18:30

**Sheet 2: Material Breakdown**
| Material | Issued | Expected | Returned | Net Consumed | Variance | Variance % | Status |
|----------|--------|----------|----------|--------------|----------|------------|--------|
| Preform 21g | 1200 | 950 | 250 | 950 | 0 | 0% | ✅ Normal |
| Cap 28mm | 1000 | 950 | 50 | 950 | 0 | 0% | ✅ Normal |
| Label Adhesive | 500g | 475g | 25g | 475g | 0 | 0% | ✅ Normal |
| **TOTALS** | - | - | - | - | **0** | **0%** | ✅ Perfect |

**Sheet 3: Variance Summary**
- Total Materials: 3
- Materials in Green (0-2%): 3
- Materials in Yellow (2-5%): 0
- Materials in Red (>5%): 0
- Overall Efficiency: 100%
- Total Wastage Value: ₹0

**Expected Results**:
✅ **Excel File Generated**:
- File name: `Production_Reconciliation_RC-2025-001_20250115.xlsx`
- Multiple sheets with organized data
- Professional formatting
- Company branding

✅ **Data Accuracy**:
- All calculations correct
- Variance percentages accurate
- Color-coding applied (green/yellow/red cells)
- Formulas included for calculations

✅ **Usability**:
- Headers frozen on scroll
- Filters enabled on tables
- Print-ready layout
- Chart/graphs included (optional)

**Use Cases**:
- Month-end reports
- Management presentations
- Audit documentation
- Data analysis in Excel

**Test Status**: ⬜ PENDING

---

### Test Case 22.5: Generate Production Reconciliation Report (PDF)
**Role**: Manager / Admin  
**Objective**: Generate printable PDF report with company branding  
**Priority**: High

**Pre-requisite**: TC 22.1 completed - Reconciliation entry created

**Steps**:
1. Navigate to: Production Operations → Production Reconciliation
2. Find reconciliation: RC-2025-001
3. Click "Print Report" or "Export to PDF" button
4. **PDF Preview Opens**

**PDF Report Layout**:

**Page 1 - Header Section**:
```
┌─────────────────────────────────────────────┐
│ [KINTO LOGO]        PRODUCTION RECONCILIATION│
│                                              │
│ Reconciliation No: RC-2025-001              │
│ Date: January 15, 2025                      │
│ Shift: Day Shift (6:00 AM - 2:00 PM)       │
└─────────────────────────────────────────────┘
```

**Production Details**:
- Product: 1 Liter PET Bottle Water
- Planned Output: 1000 bottles
- Actual Production: 950 bottles
- Production Efficiency: 95%

**Linked Documents**:
- Raw Material Issuance: ISS-2025-010
- Production Entry: PROD-2025-025

**Material Reconciliation Table**:
```
┌──────────────┬────────┬──────────┬──────────┬──────────────┬──────────┐
│ Material     │ Issued │ Expected │ Returned │ Net Consumed │ Variance │
├──────────────┼────────┼──────────┼──────────┼──────────────┼──────────┤
│ Preform 21g  │ 1200   │ 950      │ 250      │ 950          │ 0% ✅    │
│ Cap 28mm     │ 1000   │ 950      │ 50       │ 950          │ 0% ✅    │
│ Adhesive     │ 500g   │ 475g     │ 25g      │ 475g         │ 0% ✅    │
└──────────────┴────────┴──────────┴──────────┴──────────────┴──────────┘
```

**Variance Analysis**:
- Overall Variance: 0%
- Status: ✅ Excellent - All materials within tolerance
- Total Wastage Cost: ₹0

**Approval Section**:
```
Reconciled By: ____________    Date: ________
                (Manager)

Verified By:   ____________    Date: ________
              (Supervisor)
```

**Footer**:
- Page 1 of 1
- Generated: 2025-01-15 18:45
- KINTO Operations & QA Management System

5. Click "Download PDF" or "Print"

**Expected Results**:
✅ **PDF Generated**:
- File name: `Reconciliation_RC-2025-001.pdf`
- Professional layout with branding
- Print-ready format (A4 size)

✅ **Content Quality**:
- Clear tables with borders
- Color-coded variance indicators
- Company logo and branding
- Signature lines for approval

✅ **Print Features**:
- Page numbers
- Header/footer on each page
- Proper margins
- High-quality graphics

**Use Cases**:
- Physical documentation
- Management sign-off
- Audit trails
- File archival

**Test Status**: ⬜ PENDING

---

### Test Case 22.6: Reconciliation History & Audit Trail
**Role**: Manager / Admin  
**Objective**: View complete reconciliation history with filtering and audit trail  
**Priority**: Medium

**Steps**:
1. Navigate to: Production Operations → Production Reconciliation
2. **View Reconciliation History List**:
   - Shows all reconciliations (latest first)
   - Columns:
     - Reconciliation No
     - Date
     - Shift
     - Product
     - Total Variance %
     - Status (Normal/Warning/Critical)
     - Created By
     - Actions

3. **Apply Filters**:
   - Date Range: Last 7 days
   - Product: "1 Liter PET Bottle Water"
   - Shift: "Day Shift"
   - Variance Status: "All" / "Green" / "Yellow" / "Red"
   - Created By: "John Doe (Manager)"

4. **View Filtered Results**:
   - 15 reconciliations found
   - Sorted by date (newest first)
   - Color-coded by variance:
     - 12 green (0-2%)
     - 2 yellow (2-5%)
     - 1 red (>5%)

5. **Click on High Variance Reconciliation** (Red):
   - Reconciliation No: RC-2025-045
   - Date: 2025-01-12
   - Overall Variance: +8.5%
   - **View Audit Trail**:
     ```
     Jan 12, 18:30 - Created by Manager (John Doe)
     Jan 12, 18:35 - Edited by Manager (returned qty updated)
     Jan 12, 19:00 - Remarked: "Defective batch - high wastage"
     Jan 13, 09:00 - Viewed by Admin (Jane Smith)
     Jan 13, 10:00 - Flagged for review (auto-flagged: variance >5%)
     ```

6. **Export History**:
   - Click "Export All to Excel"
   - Downloads: `Reconciliation_History_20250115.xlsx`

**Expected Results**:
✅ **Comprehensive History**:
- All reconciliations displayed
- Pagination (20 per page)
- Quick search by reconciliation number
- Sortable columns

✅ **Smart Filtering**:
- Multi-criteria filters
- Date range selector
- Variance threshold filter
- User-based filter

✅ **Audit Trail Tracking**:
- Complete edit history
- User actions logged
- Timestamps for all changes
- IP addresses recorded (optional)
- Cannot delete/modify audit trail

✅ **Variance Analytics**:
- Quick identification of problem areas
- Trend visualization
- Export for deeper analysis
- Alert history for high-variance items

✅ **Compliance Features**:
- Immutable history
- User accountability
- Change justification (remarks)
- Supervisor review tracking

**Audit Trail Details Captured**:
- Action type (create, edit, view, export)
- User who performed action
- Timestamp
- Changed fields (before/after values)
- Reason for change (if edited)
- IP address

**Test Status**: ⬜ PENDING

---

## 23. Variance Analytics Dashboard

### Test Case 23.1: View Variance Trends Over Time
**Role**: Manager / Admin  
**Objective**: Analyze production efficiency and material usage trends  
**Priority**: High

**Steps**:
1. Navigate to: Production Operations → Variance Analytics
2. Select filters:
   - Date Range: Last 30 days
   - Product: "1 Liter PET Bottle Water"
   - Material: "Preform 21g"
3. View dashboard sections:
   - **Key Metrics Cards**:
     * Total Production: 28,500 bottles
     * Average Variance: -2.3%
     * Total Wastage: 658 pieces
     * Efficiency Score: 97.7%
   - **Variance Trend Chart** (Line chart):
     * Shows daily variance % over 30 days
     * Color-coded: Green (good), Yellow (moderate), Red (poor)
   - **Material Consumption Chart** (Bar chart):
     * Expected vs Actual consumption by week
   - **Top Wastage Days** (Table):
     * Lists dates with highest variance
4. Click "Export to Excel"
5. Click "Export to PDF"

**Expected Results**:
- All metrics calculated accurately
- Charts render without errors
- **Color-coded indicators work**:
  - Green: Variance ≤2%
  - Yellow: 2% < Variance ≤5%
  - Red: Variance >5%
- Trend analysis shows patterns
- Excel export downloads successfully
- PDF export downloads with branding
- Can filter by product, material, date range
- Mobile-responsive design

**Test Status**: ⬜ PENDING

---

### Test Case 23.2: Identify Problem Areas
**Role**: Manager  
**Objective**: Use analytics to identify operational improvements  
**Priority**: Medium

**Steps**:
1. Open Variance Analytics
2. Filter by "All Products"
3. Sort by "Highest Wastage"
4. Identify top 3 problem areas
5. Drill down to specific dates
6. View detailed reconciliation records

**Expected Results**:
- Can identify which products have highest variance
- Can identify which materials have highest wastage
- Can drill down to specific dates
- Actionable insights provided
- Export reports for management review

**Test Status**: ⬜ PENDING

---

## 24. Sales Returns & Damage Handling System

> **🔄 THREE-STAGE WORKFLOW**: Sales returns follow a structured process:
> ```
> Stage 1: Return Creation (from delivered invoice)
>     ↓
> Stage 2: Quality Segregation (good vs damaged)
>     ↓
> Stage 3: Inventory Reconciliation + Credit Note Generation
> ```

### Test Case 24.1: Create Sales Return from Delivered Invoice
**Role**: Manager  
**Objective**: Initiate sales return for delivered goods  
**Priority**: Critical

**Pre-requisite**: 
- Invoice delivered (TC 5.5 completed)
- POD recorded with customer signature

**Steps**:
1. Login as Manager
2. Navigate to: Finance & Sales → Sales Returns
3. Click "Create Sales Return"
4. Fill return header:
   - **Select Invoice**: Choose delivered invoice (e.g., INV-2025-001)
   - System auto-fills:
     - Customer: "XYZ Industries"
     - Original Invoice Date: 2025-01-10
     - Original Total: ₹59,000
     - Delivery Date: 2025-01-12
   - **Return Date**: Today (2025-01-15)
   - **Return Reason**: Select "Customer Complaint - Quality Issue"
   - **Remarks**: "Customer reported leaking bottles"
5. **Select Return Items**:
   - System displays all invoice items
   - Item: "1 Liter PET Bottle Water"
   - Original Quantity: 50 bottles
   - **Return Quantity**: 10 bottles (partial return)
   - **Return Type**: Select "Quality Issue" (will need quality check)
6. Click "Create Return"

**Expected Results**:
✅ **Sales Return Created**:
- Return number assigned: SR-2025-001
- Status: "Pending Quality Segregation"
- Linked to original invoice: INV-2025-001
- Return items recorded: 10 bottles

✅ **Workflow State**:
- Cannot generate credit note yet (quality segregation required first)
- Return appears in "Pending Quality Check" list
- **No inventory impact yet** (goods not yet received back)

✅ **Audit Trail**:
- Return creation logged
- Customer notified (optional)
- Manager assigned for quality check

**Test Status**: ⬜ PENDING

---

### Test Case 24.2: Quality Segregation of Returned Goods
**Role**: Manager / Quality Inspector  
**Objective**: Inspect returned items and categorize as good or damaged  
**Priority**: Critical

**Pre-requisite**: TC 24.1 completed - Sales return created (SR-2025-001)

**Steps**:
1. Login as Manager
2. Navigate to: Finance & Sales → Sales Returns
3. Find return: SR-2025-001 (Status: "Pending Quality Segregation")
4. Click "Quality Segregation"
5. **Inspect Returned Items**:
   - Item: "1 Liter PET Bottle Water"
   - Returned Quantity: 10 bottles
   
   **Segregation**:
   - **Good Condition**: 3 bottles
     - Reason: "Unopened, no damage, resaleable"
     - Disposition: "Return to Inventory"
   - **Damaged**: 7 bottles
     - Damage Type: Select "Manufacturing Defect - Leaking"
     - Severity: "Major"
     - Disposition: "Scrap/Disposal"
     - Photos: Upload 2 photos of defects
6. Add quality inspector notes: "Batch inspection recommended"
7. Click "Complete Segregation"

**Expected Results**:
✅ **Quality Segregation Complete**:
- Return status: "Pending Quality Segregation" → "Quality Checked"
- Segregation recorded:
  - Good: 3 bottles
  - Damaged: 7 bottles
- Photos attached to return record

✅ **Next Stage Triggered**:
- System ready for inventory reconciliation (TC 24.3)
- Damage report generated
- Quality data available for analytics

✅ **Notifications** (Optional):
- Production team notified about defects
- Batch quality review triggered

**Test Status**: ⬜ PENDING

---

### Test Case 24.3: Inventory Reconciliation for Returned Goods
**Role**: Manager  
**Objective**: Update inventory based on quality segregation results  
**Priority**: Critical

**Pre-requisite**: TC 24.2 completed - Quality segregation done

**Steps**:
1. Navigate to: Finance & Sales → Sales Returns
2. Find return: SR-2025-001 (Status: "Quality Checked")
3. Click "Reconcile Inventory"
4. **Review Segregation Summary**:
   - Good Condition: 3 bottles → Return to inventory
   - Damaged: 7 bottles → Write off
5. Confirm inventory actions:
   - **Good Items**: Add to finished goods inventory
   - **Damaged Items**: Create disposal/scrap record
6. Click "Reconcile Inventory"

**Expected Results**:
✅ **Inventory Updated**:
- **Finished Goods Inventory +3 bottles**
  - Transaction: "Returned from SR-2025-001 (Good Condition)"
  - Stock increased by 3 units
  - Available for resale
  
- **Damaged Goods Recorded**:
  - 7 bottles marked as scrapped
  - No inventory increase (written off)
  - Scrap record created for audit

✅ **Return Status Updated**:
- Status: "Quality Checked" → "Inventory Reconciled"
- Ready for credit note generation (TC 24.4)

✅ **Audit Trail**:
- Inventory transactions logged
- Separate entries for good vs damaged
- Scrap disposal documented

**Test Status**: ⬜ PENDING

---

### Test Case 24.4: Automatic Credit Note Generation (Same Month Return)
**Role**: Manager  
**Objective**: Verify automatic credit note generation for same-month returns  
**Priority**: Critical

> **🔑 TIME-BASED RULE**: 
> - **Same Month Return** (Invoice Jan 10, Return Jan 15) → **AUTO credit note**
> - **Old Return** (Invoice Dec 10, Return Jan 15) → **Manual tracking**

**Pre-requisite**: TC 24.3 completed - Inventory reconciled

**Scenario**: Same-month return (Invoice: Jan 10, Return: Jan 15)

**Steps**:
1. Navigate to: Finance & Sales → Sales Returns
2. Find return: SR-2025-001 (Status: "Inventory Reconciled")
3. Click "Generate Credit Note"
4. **System Auto-Calculates Credit Amount**:
   - Original Item Price: ₹1,180 per bottle (including GST)
   - Return Quantity: 10 bottles
   - **Good Condition**: 3 bottles × ₹1,180 = ₹3,540
   - **Damaged**: 7 bottles × ₹1,180 = ₹8,260
   
   **Credit Calculation**:
   - Good items credit: ₹3,540 (full credit)
   - Damaged items credit: ₹8,260 (full credit - quality issue)
   - **Total Credit**: ₹11,800
   
   **GST Breakdown** (18%):
   - Taxable Amount: ₹10,000
   - CGST (9%): ₹900
   - SGST (9%): ₹900
   - Total: ₹11,800

5. Review credit note preview
6. Click "Generate Credit Note"

**Expected Results**:
✅ **Credit Note Auto-Generated** (Same Month):
- Credit Note Number: CN-2025-001
- Type: "Sales Return Credit"
- Status: "Approved" (auto-approved for same month)
- Amount: ₹11,800
- Linked to:
  - Original Invoice: INV-2025-001
  - Sales Return: SR-2025-001

✅ **GST-Compliant Document**:
- Proper tax breakdown (CGST/SGST)
- Reference to original invoice
- Return reason documented
- Segregation details (3 good, 7 damaged)

✅ **Financial Impact**:
- Customer account credited: ₹11,800
- Can be applied to outstanding invoices (TC 25.3)
- Original invoice outstanding reduced

✅ **Return Workflow Complete**:
- Return status: "Inventory Reconciled" → "Completed"
- Credit note generated and approved
- Full audit trail maintained

**Test Status**: ⬜ PENDING

---

### Test Case 24.5: Manual Credit Note Tracking (Old Return)
**Role**: Manager  
**Objective**: Handle returns from previous months requiring manual tracking  
**Priority**: High

**Scenario**: Cross-month return (Invoice: Dec 10, 2024, Return: Jan 15, 2025)

**Steps**:
1. Create sales return for old invoice (Dec 2024)
2. Complete quality segregation
3. Complete inventory reconciliation
4. Attempt to generate credit note
5. **System Behavior**:
   - Detects cross-month return
   - Warning: "Return is from previous month - Manual credit note tracking required"
   - Cannot auto-generate credit note
   
6. **Manual Process**:
   - Create manual credit note entry
   - Requires additional approval
   - Accounting team notified
   - Manual GST adjustment required

**Expected Results**:
✅ **Manual Tracking Triggered**:
- System flags as "Manual Credit Note Required"
- Warning displayed about previous month return
- Cannot auto-approve

✅ **Approval Workflow**:
- Manager creates credit note draft
- Finance approval required
- Accounting team review
- Manual GST return adjustment

✅ **Audit & Compliance**:
- Cross-month return documented
- Separate GST period tracking
- Approval chain maintained

**Rationale**: Previous month GST already filed, requires manual adjustment

**Test Status**: ⬜ PENDING

---

## 25. Credit Notes Viewing & Management System

### Test Case 25.1: View All Credit Notes (List Page)
**Role**: Manager / Finance  
**Objective**: Access and search credit notes list  
**Priority**: High

**Steps**:
1. Login as Manager
2. Navigate to: Finance & Sales → Credit Notes
3. View credit notes list:
   - CN-2025-001: ₹11,800 (Sales Return) - Status: Approved
   - CN-2025-002: ₹5,900 (Price Adjustment) - Status: Draft
   - CN-2024-045: ₹23,600 (Sales Return) - Status: Applied
4. **Use Filters**:
   - Date Range: Last 30 days
   - Status: "Approved"
   - Type: "Sales Return"
   - Customer: "XYZ Industries"
5. **Search**: Enter credit note number or customer name
6. **Sort**: By date (newest first), amount (highest first)

**Expected Results**:
✅ **Credit Notes List Displayed**:
- All credit notes shown with key information:
  - Credit Note Number
  - Date
  - Customer Name
  - Amount (with GST)
  - Type (Sales Return, Price Adjustment, etc.)
  - Status (Draft, Approved, Applied, Cancelled)
  - Linked Invoice

✅ **Filtering & Search**:
- Filters work correctly
- Search returns accurate results
- Sort functions properly

✅ **Quick Actions**:
- View Details button
- Apply to Invoice button (for approved notes)
- Export button (PDF/Excel)
- Print button

**Test Status**: ⬜ PENDING

---

### Test Case 25.2: Credit Note Detail View with Tax Breakdown
**Role**: Manager / Finance  
**Objective**: View complete credit note details including GST breakdown  
**Priority**: Critical

**Steps**:
1. Navigate to: Finance & Sales → Credit Notes
2. Click on credit note: CN-2025-001
3. **View Credit Note Details Page**:

**Header Section**:
- Credit Note Number: CN-2025-001
- Date: 2025-01-15
- Status: Approved
- Type: Sales Return Credit
- Customer: XYZ Industries
- Original Invoice: INV-2025-001
- Sales Return Reference: SR-2025-001

**Line Items Section**:
- Item: 1 Liter PET Bottle Water
- Quantity: 10 bottles
- Rate: ₹1,000 per bottle (base price)
- Taxable Amount: ₹10,000
- GST @18%: ₹1,800
- **Line Total**: ₹11,800

**Tax Breakdown**:
- Taxable Amount: ₹10,000
- CGST @9%: ₹900
- SGST @9%: ₹900
- **Total Credit**: ₹11,800

**Additional Information**:
- Return Reason: Quality Issue - Leaking bottles
- Quality Segregation: 3 good, 7 damaged
- Inventory Impact: +3 bottles to stock
- Created By: Manager (John Doe)
- Approved By: System (Auto-approved - same month)
- Created Date: 2025-01-15

4. Click "Download PDF"
5. Click "Print"

**Expected Results**:
✅ **Complete Details Displayed**:
- All header information accurate
- Line items with proper calculations
- GST breakdown clear and correct
- Links to related documents (invoice, return)

✅ **GST Compliance**:
- Proper tax structure (CGST/SGST)
- HSN codes displayed
- Tax rates shown
- Compliant with GST regulations

✅ **Document Actions**:
- PDF download works
- Print preview formatted correctly
- Company branding/logo included

**Test Status**: ⬜ PENDING

---

### Test Case 25.3: Apply Credit Note to Outstanding Invoice
**Role**: Manager / Finance  
**Objective**: Use credit note to offset outstanding invoice balance  
**Priority**: High

**Pre-requisite**: 
- Approved credit note exists (CN-2025-001: ₹11,800)
- Customer has outstanding invoice (INV-2025-005: ₹50,000)

**Steps**:
1. Navigate to: Finance & Sales → Credit Notes
2. Find approved credit note: CN-2025-001 (₹11,800)
3. Status: "Approved" (available for application)
4. Click "Apply to Invoice"
5. **Application Dialog**:
   - Select Invoice: INV-2025-005 (Outstanding: ₹50,000)
   - Credit Note Amount: ₹11,800
   - Application Amount: ₹11,800 (full amount)
   - Confirm customer: XYZ Industries (must match)
6. Add notes: "Applied return credit to latest invoice"
7. Click "Apply Credit"

**Expected Results**:
✅ **Credit Note Applied**:
- Credit Note status: "Approved" → "Applied"
- Application date recorded
- Linked to invoice: INV-2025-005

✅ **Invoice Updated**:
- Original amount: ₹50,000
- Credit applied: ₹11,800
- **New outstanding**: ₹38,200
- Payment history shows credit note application

✅ **Financial Records**:
- Transaction logged in customer account
- Credit note marked as utilized
- Cannot be applied again
- Proper accounting entries created

✅ **Audit Trail**:
- Application recorded with timestamp
- User who applied credit logged
- Full transaction history maintained

**Verification**:
1. Navigate to: Finance & Sales → Invoices
2. Open invoice: INV-2025-005
3. Verify outstanding balance: ₹38,200
4. Check payment history shows credit application

**Test Status**: ⬜ PENDING

---

### Test Case 25.4: Credit Note Reports & Analytics
**Role**: Manager / Finance  
**Objective**: Generate credit note reports for financial analysis  
**Priority**: Medium

**Steps**:
1. Navigate to: Finance & Sales → Credit Notes
2. Click "Reports" button
3. **Generate Credit Note Summary Report**:
   - Period: Last Quarter (Oct-Dec 2024)
   - Customer: All Customers
   - Type: All Types
4. Click "Generate Report"

**Report Contents**:
- **Summary Metrics**:
  - Total Credit Notes: 45
  - Total Credit Amount: ₹4,56,000
  - Average Credit: ₹10,133
  - By Type:
    - Sales Returns: 38 notes (₹3,98,000)
    - Price Adjustments: 7 notes (₹58,000)
  
- **Top Customers by Credit**:
  1. XYZ Industries: ₹45,000 (4 notes)
  2. ABC Corp: ₹38,000 (3 notes)
  
- **Monthly Trend**:
  - October: ₹1,25,000
  - November: ₹1,48,000
  - December: ₹1,83,000

5. Click "Export to Excel"
6. Click "Export to PDF"

**Expected Results**:
✅ **Comprehensive Report**:
- All metrics calculated correctly
- Trend analysis displayed
- Breakdown by customer, type, status
- Visual charts/graphs (optional)

✅ **Export Functionality**:
- Excel export downloads with all data
- PDF export formatted professionally
- Company branding included

✅ **Analytics Insights**:
- Identify high-return customers
- Track return trends over time
- Analyze return reasons
- Financial impact assessment

**Use Cases**:
- Month-end financial closing
- Customer credit analysis
- Return trend monitoring
- Management reporting

**Test Status**: ⬜ PENDING

---

## 26. End-to-End Integration Testing 🔄

> **🎯 PURPOSE**: These test cases demonstrate complete business flows across multiple systems, validating that all components work together seamlessly in real-world manufacturing scenarios.

### Test Case 26.1: Complete Manufacturing Cycle - Raw Material to Finished Goods
**Roles**: Admin, Manager, Operator, Reviewer  
**Objective**: Execute complete manufacturing workflow from raw material setup to quality-approved finished goods  
**Priority**: CRITICAL  
**Integration Points**: Raw Material Types → Product BOM → Raw Material Issuance → Production Entry → Quality Approval

**End-to-End Scenario**: Manufacturing 500 units of "Premium Widget A"

**Phase 1: Setup (Admin)**
1. **Create Raw Material Types** (TC 18.1):
   - Navigate to Admin Dashboard → Raw Material Types
   - Create "Plastic Pellets":
     - Unit: "kg"
     - Conversion Formula: 1 bag = 25 kg
     - Loss Percentage: 2%
   - Create "Steel Rods":
     - Unit: "pieces"
     - Conversion Formula: 1 bundle = 50 pieces
     - Loss Percentage: 1%

2. **Create Product with BOM** (TC 17.1):
   - Navigate to Admin Dashboard → Product Master
   - Create "Premium Widget A":
     - Product Code: PWA-001
     - Category: Widgets
     - Type: Premium
   - Switch to "Bill of Materials" tab
   - Add BOM items:
     - Plastic Pellets: 0.5 kg per unit (500 units × 0.5 = 250 kg needed)
     - Steel Rods: 2 pieces per unit (500 units × 2 = 1000 pieces needed)
   - Save BOM

3. **Setup Raw Material Inventory** (TC 4.1):
   - Navigate to Inventory → Raw Materials
   - Add "Plastic Pellets":
     - Mode: "Ongoing Inventory"
     - Opening Stock: 300 kg (12 bags)
   - Add "Steel Rods":
     - Mode: "Ongoing Inventory"
     - Opening Stock: 1200 pieces (24 bundles)

**Phase 2: Raw Material Issuance (Manager)**
4. **BOM-Driven Issuance** (TC 20.1):
   - Navigate to Production → Raw Material Issuance
   - Click "Create Issuance"
   - Select Product: "Premium Widget A"
   - Enter Target Quantity: 500 units
   - **System Auto-Populates**:
     ```
     Material              Required   Loss (2%)   Suggested
     Plastic Pellets       250 kg     +5 kg       255 kg (10.2 bags)
     Steel Rods           1000 pcs    +10 pcs    1010 pcs (20.2 bundles)
     ```
   - Manager adjusts to whole units:
     - Plastic Pellets: 11 bags (275 kg)
     - Steel Rods: 21 bundles (1050 pieces)
   - Submit Issuance
   - **Issuance ID**: RMI-2025-001

**Phase 3: Production Entry (Operator)**
5. **Record Production** (TC 21.1):
   - Navigate to Production → Production Entry
   - Click "Create Production Entry"
   - Link to Issuance: RMI-2025-001
   - Enter Production Details:
     - Shift: "Morning Shift (6 AM - 2 PM)"
     - Operator: John Doe
     - Machine: Widget Press #3
   - Enter Actual Output:
     - Good Units: 485 units
     - Defective Units: 8 units
     - Total Produced: 493 units
   - **System Auto-Creates** 493 finished goods (status: "Pending Quality Approval")
   - Submit Production Entry
   - **Production ID**: PROD-2025-001

**Phase 4: Production Reconciliation (Manager)**
6. **Reconcile Materials** (TC 22.1):
   - Navigate to Production → Production Reconciliation
   - Click "Create Reconciliation"
   - Select Production Entry: PROD-2025-001
   - **System Shows**:
     ```
     Material          Issued    Expected    Actual Used    Returned    Variance
     Plastic Pellets   275 kg    246.5 kg    250 kg        25 kg       +3.5 kg over
     Steel Rods       1050 pcs   986 pcs     990 pcs       60 pcs      +4 pcs over
     ```
   - Manager verifies physical counts
   - Enter Actual Consumption:
     - Plastic Pellets Used: 250 kg
     - Plastic Pellets Returned: 25 kg
     - Steel Rods Used: 990 pieces
     - Steel Rods Returned: 60 pieces
   - Add Notes: "Slight overuse due to material defects in batch"
   - Submit Reconciliation
   - **Inventory Updated**:
     - Plastic Pellets: 300 - 250 + 25 = 75 kg remaining
     - Steel Rods: 1200 - 990 + 60 = 270 pieces remaining

**Phase 5: Quality Approval (Reviewer)**
7. **Approve Finished Goods** (TC 7.1):
   - Navigate to Quality → Pending Approvals
   - Filter: Production Entry PROD-2025-001
   - **See 493 units pending approval**:
     - 485 Good Units
     - 8 Defective Units
   - Review Quality:
     - Good Units: Approve 485 units → Status: "Approved for Dispatch"
     - Defective Units: Reject 8 units → Status: "Rejected"
   - **Final Inventory**:
     - Premium Widget A (Approved): 485 units available for sale
     - Premium Widget A (Rejected): 8 units (quarantined)

**Expected Results**:
✅ **Complete Material Traceability**:
- Raw materials linked to BOM
- Issuance linked to production
- Production linked to finished goods
- Reconciliation closes the loop

✅ **Inventory Accuracy**:
- Raw material stock reduced by actual consumption
- Returned materials added back to inventory
- Finished goods created with correct quantities
- Quality status properly tracked

✅ **Variance Analysis**:
- Variance calculated: +3.5 kg plastic, +4 pcs steel
- Variance percentage: +1.4% plastic, +0.4% steel
- Variance within acceptable tolerance

✅ **Audit Trail**:
- All transactions timestamped
- User actions recorded
- Document IDs linked
- Immutable history maintained

✅ **Data Integrity**:
- No phantom inventory
- No orphaned records
- All quantities reconcile
- Status workflows enforced

**Test Status**: ⬜ PENDING

---

### Test Case 26.2: Complete Sales Cycle - Finished Goods to Customer Delivery
**Roles**: Manager, Admin  
**Objective**: Execute complete sales workflow from invoice creation to proof of delivery with payment tracking  
**Priority**: CRITICAL  
**Integration Points**: Finished Goods Inventory → Invoice → Gatepass → Dispatch → Payment

**Pre-requisite**: TC 26.1 completed - 485 units of "Premium Widget A" approved for dispatch

**End-to-End Scenario**: Selling 200 units to "ABC Manufacturing Ltd."

**Phase 1: Invoice Creation (Manager)**
1. **Create GST Invoice** (TC 8.1):
   - Navigate to Sales → Invoices
   - Click "Create Invoice"
   - Customer: ABC Manufacturing Ltd.
   - Invoice Date: 2025-11-13
   - Add Line Items:
     - Premium Widget A: 200 units @ ₹500/unit = ₹1,00,000
   - **GST Calculation** (Auto):
     - Taxable Amount: ₹1,00,000
     - CGST 9%: ₹9,000
     - SGST 9%: ₹9,000
     - **Total Invoice Value**: ₹1,18,000
   - Payment Terms: Net 30 days
   - Submit Invoice
   - **Invoice ID**: INV-2025-001
   - **Status**: "Pending Gatepass"

**Phase 2: Gatepass & Dispatch (Manager)**
2. **Create Gatepass** (TC 8.2):
   - Navigate from Invoice Detail
   - Click "Create Gatepass"
   - **System Validates**: Invoice must exist (✓)
   - Gatepass Details:
     - Vehicle Number: MH-12-AB-1234
     - Driver Name: Rajesh Kumar
     - Driver Phone: +91-98765-43210
     - Expected Delivery: 2025-11-14
   - **Items Auto-Populated** from Invoice:
     - Premium Widget A: 200 units
   - Submit Gatepass
   - **Gatepass ID**: GP-2025-001
   - **Inventory Deduction Triggered**:
     - Premium Widget A: 485 - 200 = 285 units remaining

3. **Record Dispatch** (TC 10.1):
   - Status: "Gatepass Created" → "In Transit"
   - Update Dispatch Details:
     - Actual Departure: 2025-11-13 14:30
     - Transporter: XYZ Logistics
     - Tracking Number: XYZ-2025-789
   - Status: "In Transit"

4. **Record Delivery** (TC 10.2):
   - Status: "In Transit" → "Delivered"
   - Upload Proof of Delivery:
     - Customer Signature (digital)
     - Delivery Photo
     - Delivery Date: 2025-11-14 11:00
   - Status: "Delivered"

**Phase 3: Payment Tracking (Manager)**
5. **Record Partial Payment** (TC 9.1):
   - Navigate to Finance → Payments
   - Click "Record Payment"
   - Invoice: INV-2025-001
   - Payment Details:
     - Amount: ₹50,000 (partial)
     - Payment Date: 2025-11-20
     - Payment Mode: NEFT
     - Reference: NEFT-2025-XYZ123
   - **Payment Allocation**:
     - Invoice Total: ₹1,18,000
     - Paid: ₹50,000
     - Outstanding: ₹68,000
   - Submit Payment

6. **View Pending Payments** (TC 9.6):
   - Navigate to Finance → Pending Payments
   - **Dashboard Shows**:
     - ABC Manufacturing Ltd.
     - Invoice: INV-2025-001
     - Outstanding: ₹68,000
     - Due Date: 2025-12-13
     - Aging: 0-30 days (Green)

7. **Record Final Payment** (TC 9.1):
   - Record second payment:
     - Amount: ₹68,000
     - Payment Date: 2025-12-05
     - Payment Mode: Cheque
     - Reference: CHQ-456789
   - **Invoice Status**: "Fully Paid" ✓
   - **Outstanding**: ₹0

**Expected Results**:
✅ **Invoice-First Workflow Enforced**:
- Cannot create gatepass without invoice
- Gatepass auto-populates from invoice
- Quantities match exactly

✅ **Inventory Management**:
- Finished goods inventory reduced only on gatepass creation
- No inventory deduction on invoice creation
- Real-time stock levels accurate

✅ **5-Stage Dispatch Tracking**:
- Invoice Created → Gatepass Created → In Transit → Delivered → Proof of Delivery
- Status progression validated
- Cannot skip stages

✅ **Payment Tracking**:
- FIFO payment allocation
- Partial payments tracked
- Outstanding amounts calculated
- Payment history maintained
- Aging analysis accurate

✅ **GST Compliance**:
- Tax calculations correct
- Invoice format compliant
- Tax breakup displayed
- HSN codes included (if configured)

**Test Status**: ⬜ PENDING

---

### Test Case 26.3: End-to-End Integration with Returns - Raw Material to Customer with Sales Return
**Roles**: Admin, Manager, Operator, Reviewer  
**Objective**: Execute complete end-to-end business cycle including sales return, quality segregation, and credit note  
**Priority**: CRITICAL  
**Integration Points**: Manufacturing Cycle → Sales Cycle → Sales Returns → Quality Segregation → Inventory Reconciliation → Credit Notes

**Pre-requisite**: TC 26.2 completed - 200 units delivered to ABC Manufacturing Ltd.

**End-to-End Scenario**: Customer returns 15 defective units

**Phase 1: Sales Return Creation (Manager)**
1. **Create Return from Invoice** (TC 24.1):
   - Navigate to Sales → Sales Returns
   - Click "Create Return"
   - Select Invoice: INV-2025-001
   - Return Details:
     - Return Date: 2025-11-20
     - Reason: "Manufacturing Defects - Surface cracks"
     - Customer Contact: procurement@abc.com
   - Add Return Items:
     - Premium Widget A: 15 units
   - Attach Evidence:
     - Customer complaint email
     - Photos of defective units
   - Submit Return
   - **Return ID**: RET-2025-001
   - **Status**: "Return Initiated"

**Phase 2: Quality Segregation (Reviewer)**
2. **Segregate Returned Goods** (TC 24.2):
   - Navigate to Quality → Sales Returns Inspection
   - Select Return: RET-2025-001
   - **Physical Inspection** of 15 returned units:
     - Inspect each unit
     - Categorize based on quality
   - **Segregation Decision**:
     - Resaleable (Good): 8 units (minor packaging issues only)
     - Rework Required: 4 units (fixable defects)
     - Scrap/Damage: 3 units (irreparable)
   - Enter Inspection Notes: "Surface cracks on 3 units. 4 units can be refurbished. 8 units are resaleable."
   - Submit Segregation
   - **Status**: "Quality Segregation Complete"

**Phase 3: Inventory Reconciliation (Manager)**
3. **Reconcile Inventory** (TC 24.3):
   - Navigate to Inventory → Returns Reconciliation
   - Select Return: RET-2025-001
   - **System Shows Segregation**:
     ```
     Category          Quantity    Action
     Resaleable        8 units     → Add to Available Inventory
     Rework Required   4 units     → Add to Rework Inventory
     Scrap/Damage      3 units     → Add to Scrap Inventory
     ```
   - Confirm Reconciliation
   - **Inventory Updated**:
     - Premium Widget A (Available): 285 + 8 = 293 units
     - Premium Widget A (Rework): 0 + 4 = 4 units
     - Premium Widget A (Scrap): 8 + 3 = 11 units
   - **Status**: "Inventory Reconciled"

**Phase 4: Credit Note Generation (Manager)**
4. **Auto Credit Note (Same Month)** (TC 24.4):
   - **System Auto-Checks**: Return date (Nov 20) within same month as invoice (Nov 13)
   - Navigate to Finance → Credit Notes
   - **System Auto-Generated**:
     - **Credit Note ID**: CN-2025-001
     - Linked to Invoice: INV-2025-001
     - Linked to Return: RET-2025-001
   - **Credit Calculation**:
     - Returned Quantity: 15 units @ ₹500 = ₹7,500
     - CGST 9%: ₹675
     - SGST 9%: ₹675
     - **Total Credit**: ₹8,850
   - **Invoice Adjustment**:
     - Original Invoice: ₹1,18,000
     - Less: Credit Note: ₹8,850
     - **Net Payable**: ₹1,09,150
   - Credit Note Status: "Approved"

5. **Apply Credit to Outstanding** (TC 25.3):
   - Navigate to Invoice Detail: INV-2025-001
   - **Payment Status Before**:
     - Total: ₹1,18,000
     - Paid: ₹1,18,000 (from TC 26.2)
     - Outstanding: ₹0
   - **Credit Note Applied**:
     - Credit Amount: ₹8,850
     - **Refund Due to Customer**: ₹8,850
   - Process Refund:
     - Refund Mode: Bank Transfer
     - Refund Date: 2025-11-25
     - Reference: NEFT-REF-789
   - **Final Status**: "Refund Processed"

**Phase 5: Reporting & Analytics (Admin)**
6. **View Complete Audit Trail**:
   - Navigate to Reports → Transaction History
   - Filter: Customer "ABC Manufacturing Ltd."
   - **Complete Chain Visible**:
     ```
     Nov 13: Raw Material Issuance (RMI-2025-001)
     Nov 13: Production Entry (PROD-2025-001)
     Nov 13: Production Reconciliation (RECON-2025-001)
     Nov 13: Quality Approval (485 units approved)
     Nov 13: Invoice Created (INV-2025-001) - ₹1,18,000
     Nov 13: Gatepass Created (GP-2025-001) - 200 units dispatched
     Nov 14: Delivery Confirmed
     Nov 20: Payment Received - ₹50,000
     Nov 20: Sales Return Initiated (RET-2025-001) - 15 units
     Nov 20: Quality Segregation (8/4/3 split)
     Nov 20: Inventory Reconciled (+8 available, +4 rework, +3 scrap)
     Nov 20: Credit Note Generated (CN-2025-001) - ₹8,850
     Nov 25: Refund Processed - ₹8,850
     Dec 05: Final Payment - ₹68,000
     ```

7. **Variance Analytics Dashboard** (TC 23.1):
   - Navigate to Analytics → Production Variance
   - **Production Efficiency**:
     - Target: 500 units
     - Actual: 493 units
     - Efficiency: 98.6%
   - **Material Variance**:
     - Plastic Pellets: +1.4% overuse
     - Steel Rods: +0.4% overuse
   - **Quality Metrics**:
     - First Pass Yield: 485/493 = 98.4%
     - Defect Rate: 8/493 = 1.6%
     - Return Rate: 15/200 = 7.5%

**Expected Results**:
✅ **Complete End-to-End Traceability**:
- Raw materials → Production → Finished goods → Sales → Returns
- Every transaction linked and traceable
- Audit trail shows complete history
- Document IDs connected throughout

✅ **Inventory Accuracy Across Entire Cycle**:
- Raw material consumption tracked
- Finished goods creation automated
- Sales dispatch reduces inventory
- Returns properly categorized and added back
- All inventory movements accounted for

✅ **Financial Accuracy**:
- Invoice total correct with GST
- Payments tracked with FIFO allocation
- Credit note auto-generated for same-month returns
- Refund processed correctly
- Net payable calculated accurately

✅ **Quality Control Integration**:
- Production quality approval required
- Sales returns inspected and segregated
- Rework vs scrap properly categorized
- Quality metrics calculated

✅ **Business Rules Enforced**:
- Invoice-first gatepass workflow
- No inventory deduction without gatepass
- Quality approval required for dispatch
- Same-month returns auto-generate credit notes
- All state transitions validated

✅ **Reporting & Analytics**:
- Complete transaction history available
- Production variance calculated
- Material efficiency measured
- Return rates tracked
- Financial impact analyzed

**Integration Validation Points**:
1. ✅ Raw Material Types → Product BOM (TC 18.1 + TC 17.1)
2. ✅ Product BOM → Raw Material Issuance (TC 20.1)
3. ✅ Raw Material Issuance → Production Entry (TC 21.1)
4. ✅ Production Entry → Production Reconciliation (TC 22.1)
5. ✅ Production Entry → Finished Goods (Auto-creation)
6. ✅ Finished Goods → Quality Approval (TC 7.1)
7. ✅ Quality Approval → Invoice (TC 8.1)
8. ✅ Invoice → Gatepass (TC 8.2)
9. ✅ Gatepass → Inventory Deduction (Automatic)
10. ✅ Invoice → Payment Tracking (TC 9.1)
11. ✅ Invoice → Sales Return (TC 24.1)
12. ✅ Sales Return → Quality Segregation (TC 24.2)
13. ✅ Quality Segregation → Inventory Reconciliation (TC 24.3)
14. ✅ Sales Return → Credit Note (TC 24.4)
15. ✅ Credit Note → Refund Processing (TC 25.3)

**Test Status**: ⬜ PENDING

---

## Test Execution Checklist (Updated)

**Original Workflows (1-15):**
- [x] All users created and can login ✓
- [x] Session persistence working correctly ✓ (Bug Fix TC-16.1)
- [x] Role permissions configured correctly ✓
- [x] Master data setup complete ✓
- [x] Product Master tabs navigation working ✓ (Bug Fix TC-16.2)
- [x] QA Checklist workflow (5 steps) ✓
- [x] PM workflow (3 steps) ✓
- [x] Inventory workflow (4 steps) ✓
- [x] Sales & Dispatch workflow (5 steps) ✓
- [x] Credit Notes approval tracking ✓ (Bug Fix TC-16.3)
- [x] Reports generation working ✓
- [x] Notifications sending (if configured) ✓
- [x] End-to-end cycle test passed ✓

**New Production & Manufacturing Workflows (17-23):**
- [ ] Product Master with BOM Management (3 test cases) - TC 17.1-17.3
- [ ] Raw Material Type Master with Auto-Fetch (3 test cases) - TC 18.1-18.3
- [ ] Product Category & Type Master (2 test cases) - TC 19.1-19.2
- [ ] BOM-Driven Raw Material Issuance (2 test cases) - TC 20.1-20.2
- [ ] Production Entry with Variance Analysis (2 test cases) - TC 21.1-21.2
- [ ] Production Reconciliation Entry System (3 test cases) - TC 22.1-22.3
- [ ] Variance Analytics Dashboard (2 test cases) - TC 23.1-23.2

**Sales Returns & Credit Notes (24-25):**
- [ ] Sales Returns & Damage Handling (5 test cases) - TC 24.1-24.5
  - [ ] Create Sales Return from Invoice (TC 24.1)
  - [ ] Quality Segregation of Returns (TC 24.2)
  - [ ] Inventory Reconciliation (TC 24.3)
  - [ ] Auto Credit Note (Same Month) (TC 24.4)
  - [ ] Manual Credit Note (Old Returns) (TC 24.5)
- [ ] Credit Notes Viewing & Management (4 test cases) - TC 25.1-25.4
  - [ ] View Credit Notes List (TC 25.1)
  - [ ] Credit Note Detail with GST (TC 25.2)
  - [ ] Apply Credit to Invoice (TC 25.3)
  - [ ] Credit Note Reports (TC 25.4)

---

## Summary Statistics

**Total Test Cases**: 100 (was 97)  
**New Test Cases Added**: 3 comprehensive end-to-end integration tests  
**Test Sections**: 26 (was 25)  
**Coverage**: 100% of major features + End-to-End Integration ✅

**Critical Workflows Documented**:
- ✅ Manufacturing Production Cycle (Complete)
- ✅ Sales & Dispatch with Cancellations (Complete)
- ✅ Sales Returns & Credit Notes (Complete)
- ✅ Inventory Management (Complete)
- ✅ Quality & Maintenance (Complete)
- ✅ Payment Tracking (Complete)
- ✅ **End-to-End Integration Testing (Complete - NEW)** 🎯
