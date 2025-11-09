# KINTO Operations & QA Management System
## Detailed Test Execution Guide

**Complete Test Coverage: 15 Workflows | 55 Test Cases**

---

## 📋 How to Use This Guide

This guide provides **step-by-step detailed instructions** for testing every feature of the KINTO system. Each test case includes:

- **Prerequisites**: Exact data setup required before testing
- **Test Data**: Specific values to enter in forms
- **Detailed Steps**: Exact UI elements to click/interact with
- **Expected Results**: What should happen after each action
- **Validation Points**: What to verify at each step
- **Edge Cases**: Boundary conditions to test
- **Error Scenarios**: Negative testing (what should fail)
- **Post-Conditions**: Final system state after test

---

## 🔐 Test User Accounts

### Setup Test Users (Prerequisites for All Tests)

Before starting any tests, ensure these user accounts exist:

| Username | Email | Password | Role | Purpose |
|----------|-------|----------|------|---------|
| admin_test | admin@kinto.com | Admin@123 | admin | System configuration, templates |
| manager_test | manager@kinto.com | Manager@123 | manager | Assignment, approvals, oversight |
| operator_test | operator@kinto.com | Operator@123 | operator | Data entry, execution |
| reviewer_test | reviewer@kinto.com | Reviewer@123 | reviewer | Quality checks, reviews |

**How to Create Test Users** (if not already created):
1. Login as existing admin
2. Navigate to: Admin Dashboard → User Management
3. Click "Add User" button (data-testid="button-add-user")
4. Fill in each user's details from table above
5. Assign appropriate role
6. Click "Save User"
7. Verify user appears in user list

---

## 🧪 WORKFLOW 1: QA Checklist (Complete Detailed Test)

### Test Case 1.1: Admin Builds Checklist Template

**Test ID**: TC-001-01  
**Priority**: High  
**Role**: Admin  
**Objective**: Create a reusable checklist template for daily quality inspections

#### Prerequisites
- ✅ Admin user account exists and is active
- ✅ Browser: Chrome/Firefox (latest version)
- ✅ System is running (npm run dev)
- ✅ Database is accessible

#### Test Data
```
Template Name: Daily Quality Inspection - CNC Machine
Description: Morning shift quality checklist for CNC operations
Checklist Items:
  1. Oil Level Check
     - Type: Yes/No
     - Required: Yes
     - Description: "Check hydraulic oil level is between MIN and MAX marks"
  
  2. Temperature Reading
     - Type: Numeric
     - Required: Yes
     - Unit: °C
     - Min Value: 20
     - Max Value: 80
     - Description: "Record operating temperature from display"
  
  3. Visual Inspection for Leaks
     - Type: Yes/No
     - Required: Yes
     - Description: "Inspect all hoses and fittings for oil/coolant leaks"
  
  4. Safety Guards Check
     - Type: Yes/No
     - Required: Yes
     - Description: "Verify all safety guards are in place and functional"
  
  5. Emergency Stop Test
     - Type: Yes/No
     - Required: Yes
     - Description: "Test emergency stop button - must stop machine immediately"
```

#### Detailed Steps

**Step 1: Login as Admin**
1. Open browser and navigate to application URL (e.g., http://localhost:5000)
2. Locate login form
3. Enter credentials:
   - Username/Email field (data-testid="input-username"): `admin_test`
   - Password field (data-testid="input-password"): `Admin@123`
4. Click "Login" button (data-testid="button-login")

**Expected Result**:
- ✅ Login successful
- ✅ Redirected to Admin Dashboard
- ✅ URL changes to `/admin` or `/dashboard`
- ✅ Top header shows "Admin Dashboard" or user name "admin_test"
- ✅ Sidebar/navigation shows admin-only menu items

**Validation Points**:
- Check browser console for errors (F12 → Console tab)
- Verify no error messages displayed on screen
- Confirm session is established (check for logout button)

---

**Step 2: Navigate to Checklist Templates**
1. In the Admin Dashboard sidebar (left side)
2. Locate "Checklist Templates" menu item (data-testid="nav-checklist-templates")
3. Click "Checklist Templates"

**Expected Result**:
- ✅ Navigated to Checklist Templates page
- ✅ URL changes to `/admin/checklist-templates` or similar
- ✅ Page header shows "Checklist Templates"
- ✅ Table displays existing templates (if any)
- ✅ "Create Template" button is visible (data-testid="button-create-template")

**Validation Points**:
- Page loads without errors
- Table structure is visible (columns: Template Name, Description, Items Count, Actions)
- Search/filter controls are present

---

**Step 3: Click Create Template Button**
1. Locate "Create Template" button at top of page (data-testid="button-create-template")
2. Click the button

**Expected Result**:
- ✅ Modal/dialog opens OR navigated to new page
- ✅ Form title: "Create Checklist Template" or similar
- ✅ Form fields are visible and empty:
   - Template Name (text input)
   - Description (textarea)
   - "Add Item" button for checklist items
- ✅ "Save" and "Cancel" buttons present

**Validation Points**:
- Form is blank (no pre-filled data)
- All required field indicators (*) are visible
- Cancel button works (test by clicking it, then re-open form)

---

**Step 4: Fill Template Details**
1. Click in "Template Name" field (data-testid="input-template-name")
2. Type: `Daily Quality Inspection - CNC Machine`
3. Click in "Description" field (data-testid="input-template-description")
4. Type: `Morning shift quality checklist for CNC operations`

**Expected Result**:
- ✅ Text appears in fields as typed
- ✅ No character limit errors (description should accept ~500 chars)
- ✅ Fields are properly styled (no UI glitches)

**Validation Points**:
- Template name shows exactly: "Daily Quality Inspection - CNC Machine"
- Description shows full text without truncation
- No JavaScript errors in console

---

**Step 5: Add First Checklist Item (Oil Level Check)**
1. Click "Add Item" button (data-testid="button-add-item")
2. New item form appears
3. Fill in item details:
   - Item Name (data-testid="input-item-name-0"): `Oil Level Check`
   - Response Type dropdown (data-testid="select-response-type-0"): Select `Yes/No`
   - Required checkbox (data-testid="checkbox-required-0"): Check it (✓)
   - Description (data-testid="input-item-description-0"): `Check hydraulic oil level is between MIN and MAX marks`
4. Click "Save Item" or item is auto-saved

**Expected Result**:
- ✅ Item added to checklist items list
- ✅ Item #1 shows in preview/list:
   - Name: "Oil Level Check"
   - Type: Yes/No
   - Required: Yes
   - Description visible
- ✅ Form ready to add next item

**Validation Points**:
- Item counter shows "1 item" or "1/5 items"
- Item can be edited (click edit icon)
- Item can be deleted (click delete icon)
- Reorder controls work (if present)

---

**Step 6: Add Second Checklist Item (Temperature Reading)**
1. Click "Add Item" button again
2. Fill in:
   - Item Name: `Temperature Reading`
   - Response Type: Select `Numeric`
   - Required: ✓ (checked)
   - Unit field appears (data-testid="input-item-unit-1"): `°C`
   - Min Value (data-testid="input-min-value-1"): `20`
   - Max Value (data-testid="input-max-value-1"): `80`
   - Description: `Record operating temperature from display`
3. Save item

**Expected Result**:
- ✅ Item #2 added successfully
- ✅ Shows in list with:
   - Type: Numeric
   - Range: 20-80 °C
   - Required: Yes

**Validation Points**:
- Numeric type shows additional fields (min, max, unit)
- Range validation works (min < max)
- Try entering max < min (should show error)

---

**Step 7: Add Remaining Items (Items 3-5)**

Repeat the "Add Item" process for:

**Item 3:**
- Name: `Visual Inspection for Leaks`
- Type: Yes/No
- Required: Yes
- Description: `Inspect all hoses and fittings for oil/coolant leaks`

**Item 4:**
- Name: `Safety Guards Check`
- Type: Yes/No
- Required: Yes
- Description: `Verify all safety guards are in place and functional`

**Item 5:**
- Name: `Emergency Stop Test`
- Type: Yes/No
- Required: Yes
- Description: `Test emergency stop button - must stop machine immediately`

**Expected Result**:
- ✅ All 5 items visible in preview
- ✅ Items numbered 1-5
- ✅ Each shows correct type and description
- ✅ All marked as "Required"

**Validation Points**:
- Total item count: 5 items
- Items can be reordered (drag-drop or up/down buttons)
- Each item's data is correct

---

**Step 8: Save Template**
1. Scroll to bottom of form
2. Click "Save Template" button (data-testid="button-save-template")

**Expected Result**:
- ✅ Success message appears: "Template created successfully" (toast/notification)
- ✅ Modal closes OR redirected to templates list
- ✅ New template appears in table:
   - Template Name: "Daily Quality Inspection - CNC Machine"
   - Items: 5
   - Status: Active
   - Actions: Edit, Delete, View buttons

**Validation Points**:
- Template is persisted (refresh page, should still be there)
- Template ID is assigned (visible in URL or data)
- Database record created (check via SQL: `SELECT * FROM checklist_templates ORDER BY id DESC LIMIT 1`)

---

**Step 9: Verify Template Details**
1. Click "View" or "Edit" button for the newly created template
2. Review all details

**Expected Result**:
- ✅ Template name matches: "Daily Quality Inspection - CNC Machine"
- ✅ Description matches
- ✅ All 5 items present with correct data
- ✅ Item order is correct (1-5)

**Validation Points**:
- No data loss
- All fields editable
- Changes can be saved

---

#### Edge Cases to Test

**Edge Case 1: Empty Template Name**
- Try saving template without name
- **Expected**: Error message "Template name is required"

**Edge Case 2: Duplicate Template Name**
- Create another template with same name
- **Expected**: Warning or allow with duplicate name (depending on business rules)

**Edge Case 3: No Checklist Items**
- Try saving template with 0 items
- **Expected**: Error message "At least one checklist item is required"

**Edge Case 4: Very Long Description**
- Enter 1000+ characters in description
- **Expected**: Character limit enforced OR accepts all text

**Edge Case 5: Special Characters**
- Use special chars in name: `Daily Check - CNC (Model #5) @2025`
- **Expected**: Accepted without errors

**Edge Case 6: Numeric Validation**
- For temperature item, enter Min: 80, Max: 20 (reversed)
- **Expected**: Error "Min value must be less than Max value"

**Edge Case 7: Delete Item After Adding**
- Add 5 items, delete item #3, then save
- **Expected**: Template saves with 4 items, numbering adjusts

---

#### Error Scenarios (Negative Testing)

**Error Scenario 1: Network Failure**
- Disconnect network during save
- **Expected**: Error message "Failed to save template. Please check connection."

**Error Scenario 2: Session Expired**
- Wait 30 minutes idle, then try to save
- **Expected**: Session timeout, redirect to login

**Error Scenario 3: Unauthorized Access**
- Logout, try to access /admin/checklist-templates directly
- **Expected**: Redirect to login page

**Error Scenario 4: SQL Injection Attempt**
- Enter `'; DROP TABLE templates; --` in template name
- **Expected**: Input sanitized, saved as literal text

---

#### Post-Conditions

After test completion, verify:
- ✅ Template exists in database
- ✅ Template visible to Manager role (for assignment)
- ✅ Template can be edited by Admin
- ✅ Template can be deleted by Admin
- ✅ No orphaned data in database

---

### Test Case 1.2: Manager Assigns Checklist to Operator

**Test ID**: TC-001-02  
**Priority**: High  
**Role**: Manager  
**Objective**: Assign the created checklist template to an operator for execution

#### Prerequisites
- ✅ Test Case 1.1 completed (template exists)
- ✅ Manager user account active
- ✅ Operator user account active
- ✅ At least one machine exists in system
- ✅ Template: "Daily Quality Inspection - CNC Machine" is available

#### Test Data
```
Template: Daily Quality Inspection - CNC Machine
Machine: CNC Machine 001 (must exist in Machines table)
Assigned To: operator_test (Operator role)
Due Date: Today's date (use date picker)
Shift: Morning Shift
Priority: High
Notes: "Complete before starting production"
```

#### Detailed Steps

**Step 1: Logout from Admin, Login as Manager**
1. If still logged in as admin, click logout button (data-testid="button-logout")
2. On login page, enter:
   - Username: `manager_test`
   - Password: `Manager@123`
3. Click "Login"

**Expected Result**:
- ✅ Logged in as Manager
- ✅ Redirected to Manager Dashboard
- ✅ URL: `/manager` or `/dashboard`
- ✅ Top header shows "Manager Dashboard"
- ✅ Sidebar shows manager-specific menu items

**Validation Points**:
- User role indicator shows "Manager"
- Admin-only menu items are NOT visible
- Manager can see: Checklists, PM Plans, Purchase Orders, Inventory, Invoices, etc.

---

**Step 2: Navigate to Checklists**
1. In Manager Dashboard sidebar
2. Click "Checklists" (data-testid="nav-checklists")

**Expected Result**:
- ✅ Navigated to Checklists page
- ✅ URL: `/manager/checklists`
- ✅ Page shows two tabs/sections:
   - Assigned Checklists (list view)
   - Assign New Checklist (button)
- ✅ "Assign New Checklist" button visible (data-testid="button-assign-checklist")

**Validation Points**:
- Table shows existing assigned checklists (may be empty)
- Table columns: Checklist Name, Machine, Operator, Due Date, Status, Actions
- Filter/search controls present

---

**Step 3: Click Assign New Checklist**
1. Click "Assign New Checklist" button

**Expected Result**:
- ✅ Assignment form opens (modal or new page)
- ✅ Form title: "Assign Checklist"
- ✅ Form fields visible:
   - Template dropdown (shows available templates)
   - Machine dropdown (shows available machines)
   - Assigned To dropdown (shows operators only)
   - Due Date picker
   - Shift dropdown (Morning/Afternoon/Night)
   - Priority dropdown (High/Medium/Low)
   - Notes textarea

**Validation Points**:
- All dropdowns are populated with data
- Date picker shows current date as default
- Cancel button works

---

**Step 4: Select Template**
1. Click "Template" dropdown (data-testid="select-template")
2. Scroll to find "Daily Quality Inspection - CNC Machine"
3. Click to select it

**Expected Result**:
- ✅ Template selected
- ✅ Dropdown shows selected template name
- ✅ Template preview appears (shows 5 checklist items)
- ✅ Item count displayed: "5 items"

**Validation Points**:
- Preview shows all 5 items with names
- Preview shows item types (Yes/No, Numeric)
- Preview is read-only

---

**Step 5: Select Machine**
1. Click "Machine" dropdown (data-testid="select-machine")
2. Select "CNC Machine 001"

**Expected Result**:
- ✅ Machine selected
- ✅ Machine details may appear (type, location)

**Validation Points**:
- Only active machines appear in dropdown
- Inactive machines are hidden or grayed out

---

**Step 6: Select Operator**
1. Click "Assigned To" dropdown (data-testid="select-assigned-to")
2. Select "operator_test" (or operator name)

**Expected Result**:
- ✅ Operator selected
- ✅ Shows operator name

**Validation Points**:
- Dropdown shows ONLY users with "operator" role
- Managers, Admins, Reviewers NOT in list
- Active operators only

---

**Step 7: Set Due Date**
1. Click "Due Date" field (data-testid="input-due-date")
2. Date picker opens
3. Select today's date

**Expected Result**:
- ✅ Date selected and displayed
- ✅ Format: YYYY-MM-DD or DD/MM/YYYY

**Validation Points**:
- Cannot select past dates (validation)
- Can select future dates
- Date format consistent

---

**Step 8: Select Shift and Priority**
1. Click "Shift" dropdown (data-testid="select-shift")
2. Select "Morning Shift"
3. Click "Priority" dropdown (data-testid="select-priority")
4. Select "High"

**Expected Result**:
- ✅ Both fields populated
- ✅ Shift: Morning Shift
- ✅ Priority: High (may show red badge/indicator)

---

**Step 9: Add Notes**
1. Click in "Notes" textarea (data-testid="input-notes")
2. Type: `Complete before starting production`

**Expected Result**:
- ✅ Text appears in notes field

---

**Step 10: Save Assignment**
1. Click "Assign Checklist" button (data-testid="button-save-assignment")

**Expected Result**:
- ✅ Success message: "Checklist assigned successfully"
- ✅ Form closes
- ✅ New assignment appears in Assigned Checklists table:
   - Checklist: Daily Quality Inspection - CNC Machine
   - Machine: CNC Machine 001
   - Operator: operator_test
   - Due Date: Today
   - Status: Pending
   - Priority: High (red badge)

**Validation Points**:
- Assignment ID is generated
- Operator receives notification (WhatsApp/Email if configured)
- Database record created: `SELECT * FROM checklists WHERE assigned_to_user_id = [operator_id]`

---

**Step 11: Verify Notification Sent (if enabled)**
1. Check notification logs or operator's notifications
2. Operator should receive:
   - WhatsApp message: "New checklist assigned: Daily Quality Inspection - CNC Machine, Due: [today]"
   - Email notification (if configured)
   - In-app notification (bell icon shows badge)

**Expected Result**:
- ✅ Notification sent successfully
- ✅ Operator can see notification

---

#### Edge Cases to Test

**Edge Case 1: Assign Same Template to Same Machine**
- Try assigning same template to same machine on same day
- **Expected**: Allow OR show warning "Similar checklist already assigned"

**Edge Case 2: Past Due Date**
- Try setting due date to yesterday
- **Expected**: Error "Due date cannot be in the past"

**Edge Case 3: Assign to Inactive Operator**
- Select operator, then admin deactivates that user
- **Expected**: Validation fails or warning shown

**Edge Case 4: No Machines Available**
- Delete all machines, try to assign
- **Expected**: "No machines available" message

---

#### Error Scenarios

**Error Scenario 1: Required Fields Missing**
- Leave "Machine" blank, try to save
- **Expected**: Error "Machine is required"

**Error Scenario 2: Template Not Found**
- Admin deletes template while manager is filling form
- **Expected**: Error "Template no longer exists"

---

#### Post-Conditions

After test:
- ✅ Assignment exists in database
- ✅ Operator can see assignment in their dashboard
- ✅ Manager can view/edit assignment
- ✅ Status is "Pending"

---

### Test Case 1.3: Operator Executes Checklist

**Test ID**: TC-001-03  
**Priority**: Critical  
**Role**: Operator  
**Objective**: Complete assigned checklist and submit for review

#### Prerequisites
- ✅ Test Case 1.2 completed (checklist assigned)
- ✅ Operator logged in
- ✅ Checklist status: Pending
- ✅ Checklist visible in operator's dashboard

#### Test Data (Sample Responses)
```
Item 1 - Oil Level Check: Yes
Item 2 - Temperature Reading: 68°C
Item 3 - Visual Inspection for Leaks: No issues (Yes - no leaks)
Item 4 - Safety Guards Check: Yes
Item 5 - Emergency Stop Test: Yes
Overall Remarks: "All systems normal. Machine ready for production."
```

#### Detailed Steps

**Step 1: Login as Operator**
1. Logout from manager account
2. Login with:
   - Username: `operator_test`
   - Password: `Operator@123`

**Expected Result**:
- ✅ Logged in as Operator
- ✅ Redirected to Operator Dashboard
- ✅ Dashboard shows summary cards:
   - Pending Checklists: 1
   - Completed Today: 0
   - In Review: 0
   - Alerts: 0 (or any active alerts)

**Validation Points**:
- Top header shows "Operator Dashboard"
- Sidebar shows operator menu items only
- No admin/manager functions visible

---

**Step 2: View Assigned Checklists**
1. In Operator Dashboard
2. Scroll to "My Assigned Checklists" section
3. OR click "Checklists" in sidebar

**Expected Result**:
- ✅ Table shows assigned checklist(s):
   - Checklist Name: Daily Quality Inspection - CNC Machine
   - Machine: CNC Machine 001
   - Due Date: Today
   - Status: Pending (yellow badge)
   - Priority: High (red indicator)
   - Action button: "Start Checklist"

**Validation Points**:
- Only operator's assigned checklists visible
- Other operators' checklists NOT visible
- Overdue items highlighted (if any)

---

**Step 3: Start Checklist**
1. Click "Start Checklist" button (data-testid="button-start-checklist-[id]")

**Expected Result**:
- ✅ Checklist execution page opens
- ✅ Header shows:
   - Checklist Name: Daily Quality Inspection - CNC Machine
   - Machine: CNC Machine 001
   - Shift: Morning Shift
   - Operator: operator_test (you)
   - Start Time: Current timestamp
- ✅ All 5 checklist items displayed as form fields
- ✅ Progress indicator: 0/5 items completed

**Validation Points**:
- Page is clean and easy to navigate
- Form is empty (no pre-filled data except defaults)
- Save Draft button visible
- Submit button visible but may be disabled until all required fields filled

---

**Step 4: Fill Item 1 - Oil Level Check**
1. Locate Item 1: "Oil Level Check"
2. Read description: "Check hydraulic oil level is between MIN and MAX marks"
3. Response type: Yes/No radio buttons or toggle
4. Select: **Yes** (data-testid="radio-item-1-yes")

**Expected Result**:
- ✅ "Yes" selected (radio button filled or toggle turned on)
- ✅ Progress updates: 1/5 items completed (20%)
- ✅ Item 1 marked with checkmark or green indicator

**Validation Points**:
- Only one option selectable (Yes OR No, not both)
- Selection is highlighted visually
- Can change selection before submitting

---

**Step 5: Fill Item 2 - Temperature Reading**
1. Locate Item 2: "Temperature Reading"
2. Read description and range: 20-80°C
3. Click in numeric input field (data-testid="input-item-2")
4. Type: `68`
5. Unit °C auto-displayed

**Expected Result**:
- ✅ Value "68" entered
- ✅ Shows: "68 °C"
- ✅ No validation error (value within range 20-80)
- ✅ Progress: 2/5 (40%)

**Validation Points**:
- Value must be numeric only (letters rejected)
- Decimal values accepted (e.g., 68.5)
- Out-of-range validation:
  - Try entering `19` → Error: "Value must be between 20 and 80"
  - Try entering `85` → Error: "Value must be between 20 and 80"

---

**Step 6: Fill Item 3 - Visual Inspection for Leaks**
1. Item 3: "Visual Inspection for Leaks"
2. Description: "Inspect all hoses and fittings for oil/coolant leaks"
3. Select: **Yes** (meaning "Yes, inspection done, no leaks found")

**Expected Result**:
- ✅ "Yes" selected
- ✅ Progress: 3/5 (60%)

---

**Step 7: Fill Item 4 - Safety Guards Check**
1. Item 4: "Safety Guards Check"
2. Select: **Yes**

**Expected Result**:
- ✅ "Yes" selected
- ✅ Progress: 4/5 (80%)

---

**Step 8: Fill Item 5 - Emergency Stop Test**
1. Item 5: "Emergency Stop Test"
2. Description: "Test emergency stop button - must stop machine immediately"
3. Select: **Yes**

**Expected Result**:
- ✅ "Yes" selected
- ✅ Progress: 5/5 (100%)
- ✅ All items completed indicator (green checkmark or message)
- ✅ Submit button now ENABLED (data-testid="button-submit-checklist")

**Validation Points**:
- Progress bar/counter shows 100%
- All items have checkmarks or completed indicators
- No validation errors

---

**Step 9: Add Overall Remarks**
1. Scroll to bottom of form
2. Locate "Remarks" or "Notes" textarea (data-testid="textarea-remarks")
3. Type: `All systems normal. Machine ready for production.`

**Expected Result**:
- ✅ Text appears in remarks field
- ✅ Character count updates (if shown)

**Validation Points**:
- Accepts at least 500 characters
- Special characters allowed
- Line breaks preserved

---

**Step 10: Review Before Submitting**
1. Scroll through entire checklist
2. Verify all responses:
   - Item 1: Yes ✓
   - Item 2: 68°C ✓
   - Item 3: Yes ✓
   - Item 4: Yes ✓
   - Item 5: Yes ✓
   - Remarks: Filled ✓

**Expected Result**:
- ✅ All data correct
- ✅ Can edit any item if needed

---

**Step 11: Submit for Review**
1. Click "Submit for Review" button (data-testid="button-submit-checklist")
2. Confirmation dialog may appear: "Are you sure you want to submit? You cannot edit after submission."
3. Click "Confirm" or "Yes"

**Expected Result**:
- ✅ Success message: "Checklist submitted successfully"
- ✅ Redirected to Operator Dashboard or Checklist History page
- ✅ Checklist status changed: Pending → **In Review** (blue badge)
- ✅ Submitted timestamp recorded
- ✅ Checklist locked (cannot be edited by operator)

**Validation Points**:
- Database updated: `status = 'in_review'`, `submitted_at = [timestamp]`
- Reviewer receives notification:
  - WhatsApp: "New checklist submission for review: Daily Quality Inspection - CNC Machine"
  - Email notification
  - In-app notification badge
- Manager receives notification (depending on workflow)

---

**Step 12: Verify Submission in History**
1. Navigate to "History" or "My Submissions" in operator dashboard
2. Find submitted checklist

**Expected Result**:
- ✅ Checklist appears in history table:
   - Name: Daily Quality Inspection - CNC Machine
   - Machine: CNC Machine 001
   - Submitted: [timestamp]
   - Status: In Review
   - Action: "View" (read-only)
- ✅ Click "View" shows filled checklist (cannot edit)

**Validation Points**:
- Submitted date/time accurate
- All responses visible in view mode
- Edit/Delete buttons NOT visible (locked)

---

#### Edge Cases to Test

**Edge Case 1: Save as Draft**
- Fill 3/5 items, click "Save Draft" button
- **Expected**: Draft saved, can resume later
- Verify: Logout, login, draft should be loadable

**Edge Case 2: Session Timeout During Filling**
- Fill checklist, wait 30 mins idle, try to submit
- **Expected**: Session expired, redirect to login, draft may be lost
- Improvement: Auto-save drafts every 2 mins

**Edge Case 3: Submit with Missing Required Fields**
- Leave Item 2 (temperature) blank, try to submit
- **Expected**: Error "Temperature Reading is required"

**Edge Case 4: Out-of-Range Temperature**
- Enter temperature = 95°C (> 80)
- **Expected**: Validation error "Temperature must be between 20°C and 80°C"

**Edge Case 5: Browser Refresh During Filling**
- Fill 3 items, refresh page
- **Expected**: Data lost OR restored from auto-save

**Edge Case 6: Submit Same Checklist Twice**
- Submit checklist, try to start it again
- **Expected**: Status is "In Review", cannot restart

---

#### Error Scenarios

**Error Scenario 1: Network Failure on Submit**
- Disconnect internet, click submit
- **Expected**: Error "Failed to submit. Please check your connection."
- Data retained in form, can retry

**Error Scenario 2: Checklist Deleted Before Submission**
- Admin/Manager deletes assignment while operator is filling
- Try to submit
- **Expected**: Error "Checklist no longer exists"

**Error Scenario 3: Concurrent Editing**
- Two operators assigned same checklist (if system allows)
- Both submit
- **Expected**: First submission wins OR both rejected

---

#### Post-Conditions

After test:
- ✅ Checklist status = "in_review"
- ✅ Operator cannot edit anymore
- ✅ Reviewer can see in their pending reviews queue
- ✅ Manager can see in "Awaiting Review" section
- ✅ All responses saved in database
- ✅ Submission timestamp recorded
- ✅ Notifications sent to reviewer

---

### Test Case 1.4: Reviewer Checks Submitted Checklist

**Test ID**: TC-001-04  
**Priority**: High  
**Role**: Reviewer  
**Objective**: Review operator's submission, verify data quality, and approve for manager

#### Prerequisites
- ✅ Test Case 1.3 completed (checklist submitted)
- ✅ Reviewer logged in
- ✅ Checklist status: In Review
- ✅ Reviewer has notification of pending review

#### Test Data
```
Review Comments: "Verified. All parameters within acceptable range. Oil level confirmed visually. Temperature reading matches display. No leaks observed. Safety systems operational."
Review Decision: Approve
```

#### Detailed Steps

**Step 1: Login as Reviewer**
1. Logout from operator account
2. Login with:
   - Username: `reviewer_test`
   - Password: `Reviewer@123`

**Expected Result**:
- ✅ Logged in as Reviewer
- ✅ Redirected to Reviewer Dashboard
- ✅ Dashboard shows:
   - Pending Reviews: 1 (or more)
   - Reviewed Today: 0
   - Total This Week: [count]
- ✅ Notification badge shows "1" (new submission)

**Validation Points**:
- Header shows "Reviewer Dashboard"
- Sidebar shows reviewer menu
- No operator functions visible

---

**Step 2: View Pending Reviews**
1. In Reviewer Dashboard
2. Section: "Submissions to Review" or "Pending Reviews"
3. Table shows checklist(s) awaiting review

**Expected Result**:
- ✅ Table displays:
   - Checklist: Daily Quality Inspection - CNC Machine
   - Machine: CNC Machine 001
   - Operator: operator_test
   - Submitted: [timestamp]
   - Priority: High (red badge)
   - Status: Pending Review
   - Action: "Review" button

**Validation Points**:
- Only "In Review" status checklists visible
- Sorted by priority (High → Medium → Low)
- Or sorted by submission time (oldest first)

---

**Step 3: Click Review Button**
1. Click "Review" button (data-testid="button-review-[id]")

**Expected Result**:
- ✅ Checklist review page opens
- ✅ Header shows:
   - Checklist Name
   - Machine
   - Operator Name
   - Submitted At: [timestamp]
   - Submission ID
- ✅ All 5 items displayed with operator's responses (read-only)
- ✅ Operator's remarks visible
- ✅ Review section at bottom:
   - Review Comments textarea
   - Approve/Reject buttons

**Validation Points**:
- All operator responses are visible
- Responses are read-only (reviewer cannot change)
- Items show validation status (green checkmarks for valid responses)

---

**Step 4: Review Item 1 - Oil Level Check**
1. View Item 1: "Oil Level Check"
2. Operator Response: **Yes**
3. Verify: Response is acceptable

**Expected Result**:
- ✅ Item shows: Yes ✓
- ✅ Green checkmark or valid indicator

**Validation Points**:
- Response matches expected format (Yes/No)
- Reviewer understands what "Yes" means
- Item description is clear

---

**Step 5: Review Item 2 - Temperature Reading**
1. View Item 2: "Temperature Reading"
2. Operator Response: **68°C**
3. Verify: Value is within acceptable range (20-80°C)
4. Check: 68 is normal operating temperature

**Expected Result**:
- ✅ Shows: "68°C"
- ✅ Within range indicator (green)
- ✅ No validation warnings

**Validation Points**:
- Value is numeric
- Unit is displayed (°C)
- Range validation visible (20-80°C)
- 68 is reasonable (not 68.0000001 which might indicate sensor issue)

---

**Step 6: Review Items 3-5**
1. View Item 3: "Visual Inspection for Leaks" → Yes
2. View Item 4: "Safety Guards Check" → Yes
3. View Item 5: "Emergency Stop Test" → Yes
4. Verify all are acceptable

**Expected Result**:
- ✅ All items show "Yes"
- ✅ All within acceptable parameters
- ✅ No anomalies detected

---

**Step 7: Review Operator Remarks**
1. Scroll to operator remarks section
2. Read: "All systems normal. Machine ready for production."
3. Verify remarks align with checklist responses

**Expected Result**:
- ✅ Remarks are clear and professional
- ✅ No safety concerns mentioned
- ✅ Remarks support the "Yes" responses

---

**Step 8: Add Review Comments**
1. Scroll to "Review Comments" section
2. Click in textarea (data-testid="textarea-review-comments")
3. Type: `Verified. All parameters within acceptable range. Oil level confirmed visually. Temperature reading matches display. No leaks observed. Safety systems operational.`

**Expected Result**:
- ✅ Text appears in comments field
- ✅ Character count updates (if shown)

**Validation Points**:
- Accepts detailed comments (500+ chars)
- Formatting preserved
- Required field (cannot submit without comments)

---

**Step 9: Approve Checklist**
1. Locate action buttons:
   - "Approve & Send to Manager" (data-testid="button-approve")
   - "Reject & Return to Operator" (data-testid="button-reject")
2. Click "Approve & Send to Manager"

**Expected Result**:
- ✅ Confirmation dialog: "Are you sure you want to approve this checklist?"
- ✅ Click "Confirm"
- ✅ Success message: "Checklist approved and sent to manager"
- ✅ Redirected to Reviewer Dashboard
- ✅ Checklist removed from "Pending Reviews" list
- ✅ Checklist status changed: In Review → **Reviewed** (green badge)

**Validation Points**:
- Database updated: `status = 'reviewed'`, `reviewed_by = [reviewer_id]`, `reviewed_at = [timestamp]`
- Manager receives notification:
  - WhatsApp: "Checklist approved by reviewer: Daily Quality Inspection - CNC Machine"
  - Email notification
  - In-app notification
- Operator receives notification (optional): "Your checklist has been reviewed and approved"

---

**Step 10: Verify in Review History**
1. Navigate to "Review History" in reviewer dashboard
2. Find approved checklist

**Expected Result**:
- ✅ Checklist in history:
   - Status: Reviewed
   - Reviewed By: reviewer_test (you)
   - Reviewed At: [timestamp]
   - Decision: Approved
   - Action: "View" (read-only)

**Validation Points**:
- Review comments saved
- Cannot change decision after approval
- Audit trail complete

---

#### Edge Cases to Test

**Edge Case 1: Reject Checklist**
- Instead of approving, click "Reject"
- Add rejection reason: "Temperature reading suspicious. Please re-check sensor calibration."
- **Expected**: Checklist returned to operator with status "Rejected"
- Operator can see rejection reason and resubmit

**Edge Case 2: Missing Review Comments**
- Try clicking "Approve" without adding comments
- **Expected**: Error "Review comments are required"

**Edge Case 3: Review Already Completed**
- Another reviewer approves same checklist (if system allows multiple reviewers)
- Try to approve again
- **Expected**: Error "Checklist already reviewed" or status updated automatically

**Edge Case 4: Very Long Comments**
- Add 2000 characters in review comments
- **Expected**: Accepted OR character limit enforced with warning

---

#### Error Scenarios

**Error Scenario 1: Checklist Deleted During Review**
- Manager deletes checklist while reviewer is reviewing
- Try to approve
- **Expected**: Error "Checklist no longer exists"

**Error Scenario 2: Session Timeout**
- Open review page, wait 30 mins, try to approve
- **Expected**: Session expired, redirect to login

---

#### Post-Conditions

After test:
- ✅ Checklist status = "reviewed"
- ✅ Review comments saved
- ✅ Manager can see in "Awaiting Final Approval" queue
- ✅ Reviewer timestamp recorded
- ✅ Manager notified

---

### Test Case 1.5: Manager Final Approval

**Test ID**: TC-001-05  
**Priority**: Critical  
**Role**: Manager  
**Objective**: Provide final approval and close the checklist workflow

#### Prerequisites
- ✅ Test Case 1.4 completed (checklist reviewed)
- ✅ Manager logged in
- ✅ Checklist status: Reviewed
- ✅ Manager has notification

#### Test Data
```
Final Approval Comments: "Final approval granted. Checklist complete and satisfactory. Machine cleared for production use."
Decision: Approve
```

#### Detailed Steps

**Step 1: Login as Manager**
1. Logout from reviewer
2. Login as manager_test

**Expected Result**:
- ✅ Manager Dashboard displayed
- ✅ Notification badge shows "1" (new reviewed checklist)

---

**Step 2: Navigate to Awaiting Final Approval**
1. In Manager Dashboard sidebar
2. Click "Checklists" → "Awaiting Final Approval" tab
3. OR see section: "Ready for Final Approval"

**Expected Result**:
- ✅ Table shows:
   - Checklist: Daily Quality Inspection - CNC Machine
   - Machine: CNC Machine 001
   - Operator: operator_test
   - Reviewer: reviewer_test
   - Reviewed At: [timestamp]
   - Status: Reviewed (awaiting manager approval)
   - Action: "Review" button

**Validation Points**:
- Only "Reviewed" status checklists visible here
- Sorted by priority or review time

---

**Step 3: Click Review Button**
1. Click "Review" button (data-testid="button-final-review-[id]")

**Expected Result**:
- ✅ Checklist final approval page opens
- ✅ Shows complete audit trail:
   - **Assignment Details**: Assigned by manager_test on [date]
   - **Execution Details**: Completed by operator_test on [date/time]
   - **Review Details**: Reviewed by reviewer_test on [date/time]
- ✅ All checklist items with operator responses visible (read-only)
- ✅ Operator remarks visible
- ✅ Reviewer comments visible
- ✅ Final approval section:
   - Manager Comments textarea
   - "Final Approve" button (data-testid="button-final-approve")
   - "Send Back for Re-Review" button (optional)

**Validation Points**:
- Complete workflow history visible
- All timestamps accurate
- Cannot edit operator or reviewer data

---

**Step 4: Review Complete Checklist**
1. Review all 5 items and responses
2. Review operator remarks
3. Review reviewer comments: "Verified. All parameters within acceptable range..."
4. Verify everything is satisfactory

**Expected Result**:
- ✅ All data looks correct
- ✅ Reviewer comments indicate approval
- ✅ No red flags or anomalies

---

**Step 5: Add Manager Approval Comments**
1. Scroll to "Manager Comments" textarea (data-testid="textarea-manager-comments")
2. Type: `Final approval granted. Checklist complete and satisfactory. Machine cleared for production use.`

**Expected Result**:
- ✅ Text entered in comments field

---

**Step 6: Final Approve**
1. Click "Final Approve" button (data-testid="button-final-approve")
2. Confirmation dialog: "This will close the checklist workflow. Continue?"
3. Click "Confirm"

**Expected Result**:
- ✅ Success message: "Checklist approved successfully"
- ✅ Redirected to Manager Dashboard
- ✅ Checklist status: Reviewed → **Completed** (green badge)
- ✅ Checklist removed from "Awaiting Approval" queue
- ✅ Workflow closed

**Validation Points**:
- Database updated: `status = 'completed'`, `approved_by = [manager_id]`, `approved_at = [timestamp]`
- Operator receives notification (optional): "Your checklist has been fully approved"
- Checklist marked as complete in system
- Cannot be reopened or edited

---

**Step 7: Verify in Completed Checklists**
1. Navigate to "Checklists" → "Completed" tab
2. Find the checklist

**Expected Result**:
- ✅ Checklist in completed list:
   - Status: Completed ✓
   - Completed At: [timestamp]
   - Completion percentage: 100%
   - Full audit trail visible

**Validation Points**:
- Complete workflow from assignment → approval documented
- All actors (manager, operator, reviewer, approver) recorded
- All timestamps captured
- Quality data preserved for reporting

---

#### Edge Cases to Test

**Edge Case 1: Send Back for Re-Review**
- Click "Send Back for Re-Review" instead of approve
- Add reason: "Please verify temperature reading with calibrated thermometer"
- **Expected**: Checklist status → "In Re-Review", reviewer notified

**Edge Case 2: Bulk Approval**
- If 10 checklists awaiting approval, select all
- Click "Bulk Approve"
- **Expected**: All approved simultaneously (if feature exists)

---

#### Error Scenarios

**Error Scenario 1: Checklist Deleted**
- Admin deletes checklist while manager is reviewing
- Try to approve
- **Expected**: Error "Checklist no longer exists"

---

#### Post-Conditions

After complete workflow:
- ✅ Checklist status = "completed"
- ✅ Workflow closed
- ✅ All actors' actions recorded
- ✅ Data available for analytics/reports
- ✅ Quality compliance documented

---

## 🎯 Summary: QA Checklist Workflow Complete

**Workflow Steps Tested:**
1. ✅ Admin builds template (TC-001-01)
2. ✅ Manager assigns to operator (TC-001-02)
3. ✅ Operator executes checklist (TC-001-03)
4. ✅ Reviewer reviews submission (TC-001-04)
5. ✅ Manager final approval (TC-001-05)

**Total Test Cases**: 5  
**Coverage**: 100% of workflow  
**All Roles Tested**: Admin, Manager, Operator, Reviewer  
**Status Flow**: Template → Assigned → Pending → In Review → Reviewed → Completed

---

## 📊 Remaining Workflows (Test Cases 2-15)

The same detailed format applies to all remaining workflows:
- **Workflow 2**: Preventive Maintenance (4 tests)
- **Workflow 3**: Machine Startup Reminder (5 tests)
- **Workflow 4**: Inventory Management (4 tests)
- **Workflow 5**: Sales & Dispatch (5 tests)
- **Workflow 6**: User & Role Management (3 tests)
- **Workflow 7**: Reporting & Analytics (2 tests)
- **Workflow 8**: Missed Checklist Notifications (3 tests)
- **Workflow 9**: Payment Tracking & FIFO (5 tests)
- **Workflow 10**: Spare Parts Management (4 tests)
- **Workflow 11**: Notification System Config (1 test)
- **Workflow 12**: Printing & Document Export (7 tests)
- **Workflow 13**: System Alerts & Notifications (6 tests)
- **Workflow 14**: Vendor Management (1 test)
- **Workflow 15**: End-to-End Manufacturing Cycle (1 integration test)

**Each workflow follows the same detailed structure with:**
- Prerequisites
- Test Data
- Detailed Steps (10-15 steps per test)
- Expected Results
- Validation Points
- Edge Cases
- Error Scenarios
- Post-Conditions

---

## 📝 Test Execution Tips

### Before Starting Tests
1. ✅ Set up test database (separate from production)
2. ✅ Create all test user accounts
3. ✅ Clear browser cache
4. ✅ Open browser console (F12) to monitor errors
5. ✅ Prepare test data spreadsheet
6. ✅ Enable notifications (WhatsApp, Email) if testing alerts

### During Testing
1. ✅ Follow steps exactly as written
2. ✅ Verify expected results at each step
3. ✅ Document any deviations or bugs found
4. ✅ Take screenshots of errors
5. ✅ Check database state after critical operations
6. ✅ Monitor browser console for JavaScript errors
7. ✅ Test on multiple browsers (Chrome, Firefox, Safari)

### After Testing
1. ✅ Clean up test data (or reset database)
2. ✅ Document all bugs found
3. ✅ Calculate pass/fail rate
4. ✅ Update test cases if requirements changed
5. ✅ Share test results with team

---

## 🐛 Bug Reporting Template

When you find a bug during testing, document it as:

```
BUG ID: BUG-001
Test Case: TC-001-03
Severity: High / Medium / Low
Priority: Critical / High / Medium / Low

Title: [Short description]

Steps to Reproduce:
1. [Exact steps]
2. [To reproduce]
3. [The bug]

Expected Result:
[What should happen]

Actual Result:
[What actually happened]

Screenshots:
[Attach screenshots]

Browser: Chrome 120.0
OS: Windows 11
Database: PostgreSQL 15
Date Found: 2025-01-15

Additional Notes:
[Any other relevant info]
```

---

## ✅ Test Checklist Summary

| Workflow | Test Cases | Status | Pass | Fail | Notes |
|----------|------------|--------|------|------|-------|
| 1. QA Checklist | 5 | ⬜ Not Started | - | - | - |
| 2. PM Workflow | 4 | ⬜ Not Started | - | - | - |
| 3. Machine Startup | 5 | ⬜ Not Started | - | - | - |
| 4. Inventory | 4 | ⬜ Not Started | - | - | - |
| 5. Sales & Dispatch | 5 | ⬜ Not Started | - | - | - |
| 6. User & Role | 3 | ⬜ Not Started | - | - | - |
| 7. Reporting | 2 | ⬜ Not Started | - | - | - |
| 8. Notifications | 3 | ⬜ Not Started | - | - | - |
| 9. Payments | 5 | ⬜ Not Started | - | - | - |
| 10. Spare Parts | 4 | ⬜ Not Started | - | - | - |
| 11. Config | 1 | ⬜ Not Started | - | - | - |
| 12. Printing | 7 | ⬜ Not Started | - | - | - |
| 13. Alerts | 6 | ⬜ Not Started | - | - | - |
| 14. Vendors | 1 | ⬜ Not Started | - | - | - |
| 15. E2E Integration | 1 | ⬜ Not Started | - | - | - |
| **TOTAL** | **55** | **0%** | **0** | **0** | **-** |

---

**End of Detailed Test Guide - Workflow 1 Complete**  
*Remaining 14 workflows follow the same detailed format*
