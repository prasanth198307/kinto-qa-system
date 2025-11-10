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

## 🔧 WORKFLOW 2: Preventive Maintenance (PM) Workflow

### Test Case 2.1: Admin Creates PM Template

**Test ID**: TC-002-01  
**Priority**: High  
**Role**: Admin  
**Objective**: Create a reusable PM template for scheduled maintenance tasks

#### Prerequisites
- ✅ Admin user logged in
- ✅ At least one machine type exists in system

#### Test Data
```
Template Name: Monthly Hydraulic System Check
Machine Type: Hydraulic Press
Frequency: Monthly (every 30 days)
Estimated Duration: 2 hours
PM Tasks:
  1. Check hydraulic fluid level
  2. Inspect hoses for cracks/wear
  3. Test pressure gauge accuracy
  4. Lubricate moving parts
  5. Clean filters
  6. Check for unusual noises
Required Spare Parts:
  - Hydraulic Fluid (2L)
  - Filter Cartridge (1 unit)
```

#### Detailed Steps

**Step 1-3: Login and Navigate**
1. Login as admin_test
2. Navigate to: Admin Dashboard → PM Templates
3. Click "Create PM Template" (data-testid="button-create-pm-template")

**Expected**: PM template form opens

**Step 4-6: Fill Template Details**
4. Template Name: `Monthly Hydraulic System Check`
5. Machine Type: Select "Hydraulic Press"
6. Frequency: `30` days, Estimated Duration: `2` hours

**Expected**: Fields populated correctly

**Step 7-12: Add PM Tasks**
7. Click "Add Task" 6 times
8. Fill each task:
   - Task 1: "Check hydraulic fluid level"
   - Task 2: "Inspect hoses for cracks/wear"
   - Task 3: "Test pressure gauge accuracy"
   - Task 4: "Lubricate moving parts"
   - Task 5: "Clean filters"
   - Task 6: "Check for unusual noises"

**Expected**: All 6 tasks added

**Step 13-14: Add Required Spare Parts**
13. Click "Add Spare Part"
14. Add:
    - Hydraulic Fluid - Quantity: 2L
    - Filter Cartridge - Quantity: 1

**Expected**: Spare parts linked to template

**Step 15: Save Template**
15. Click "Save PM Template"

**Expected**: Template created, appears in PM Templates list

#### Edge Cases
- Empty task list → Error: "At least one task required"
- Duplicate template name → Allow or warn
- Invalid frequency (0 days) → Error: "Frequency must be > 0"

---

### Test Case 2.2: Manager Schedules PM Plan

**Test ID**: TC-002-02  
**Priority**: High  
**Role**: Manager  
**Objective**: Schedule PM execution based on template

#### Prerequisites
- ✅ Test Case 2.1 completed
- ✅ Machine "Hydraulic Press 01" exists
- ✅ Operator available

#### Test Data
```
PM Template: Monthly Hydraulic System Check
Machine: Hydraulic Press 01
Scheduled Date: Tomorrow's date
Assigned To: operator_test
Priority: High
```

#### Detailed Steps

**Step 1-3: Login and Navigate**
1. Login as manager_test
2. Navigate to: Manager Dashboard → PM Plans
3. Click "Schedule PM"

**Expected**: PM scheduling form opens

**Step 4-7: Fill Schedule Details**
4. Select Template: "Monthly Hydraulic System Check"
5. Select Machine: "Hydraulic Press 01"
6. Scheduled Date: Tomorrow
7. Assign to: operator_test
8. Priority: High

**Expected**: Form validates, preview shows 6 tasks + spare parts

**Step 8: Save PM Plan**
8. Click "Schedule PM"

**Expected**: 
- PM plan created
- Operator notified
- Status: Scheduled
- Appears in "Upcoming PM" list

#### Edge Cases
- Schedule in past → Error
- Overlapping PM on same machine → Warning

---

### Test Case 2.3: Operator Executes PM Tasks

**Test ID**: TC-002-03  
**Priority**: Critical  
**Role**: Operator  
**Objective**: Execute scheduled PM and record completion

#### Prerequisites
- ✅ Test Case 2.2 completed
- ✅ PM status: Scheduled
- ✅ Spare parts available in inventory

#### Test Data
```
Task Completion:
  1. Fluid level: ✓ Normal
  2. Hoses: ✓ No cracks found
  3. Pressure gauge: ✓ Accurate (150 PSI)
  4. Lubrication: ✓ Applied
  5. Filters: ✓ Cleaned
  6. Noise check: ✓ Operating normally
Spare Parts Used:
  - Hydraulic Fluid: 2L
  - Filter Cartridge: 1 unit
Duration: 1.5 hours
Notes: "All tasks completed. System running smoothly."
```

#### Detailed Steps

**Step 1-3: Login and Start PM**
1. Login as operator_test
2. Navigate to: Operator Dashboard → PM Execution
3. Find PM: "Monthly Hydraulic System Check - Hydraulic Press 01"
4. Click "Start PM"

**Expected**: PM execution page opens, timer starts

**Step 4-9: Complete Each Task**
4. Task 1 - Check fluid level: Mark ✓ Complete, Notes: "Normal"
5. Task 2 - Inspect hoses: Mark ✓ Complete
6. Task 3 - Test pressure: Mark ✓ Complete, Value: "150 PSI"
7. Task 4 - Lubricate: Mark ✓ Complete
8. Task 5 - Clean filters: Mark ✓ Complete
9. Task 6 - Noise check: Mark ✓ Complete

**Expected**: Progress: 6/6 tasks (100%)

**Step 10-11: Record Spare Parts Usage**
10. Select spare parts used:
    - Hydraulic Fluid: 2L (auto-deducts from inventory)
    - Filter Cartridge: 1 unit
11. Verify inventory deducted

**Expected**: Inventory updated automatically

**Step 12-13: Add Notes and Submit**
12. Add overall notes: "All tasks completed. System running smoothly."
13. Click "Complete PM"

**Expected**:
- PM status: Completed
- Completion time: 1.5 hours recorded
- Manager notified
- History record created

#### Edge Cases
- Incomplete tasks → Warning: "2 tasks remaining"
- Spare parts not available → Alert, allow proceed with note
- Exceed estimated time → Highlight but allow

---

### Test Case 2.4: Manager Reviews PM History

**Test ID**: TC-002-04  
**Priority**: Medium  
**Role**: Manager  
**Objective**: Review completed PM records and trends

#### Prerequisites
- ✅ Test Case 2.3 completed
- ✅ PM completed status

#### Detailed Steps

**Step 1-3: Login and Navigate**
1. Login as manager_test
2. Navigate to: Manager Dashboard → PM History
3. Filter: Last 30 days, Machine: Hydraulic Press 01

**Expected**: Shows completed PM

**Step 4-6: View PM Details**
4. Click "View Details" for completed PM
5. Review:
   - All 6 tasks marked complete
   - Spare parts used: 2L fluid, 1 filter
   - Duration: 1.5 hours (vs estimated 2 hours)
   - Operator notes visible
   - Completion timestamp accurate

**Expected**: Complete audit trail visible

**Step 7: Print PM Report**
7. Click "Print Report"

**Expected**: Professional PM completion report with:
- Machine details
- Tasks completed
- Parts used
- Operator signature
- Manager approval section

#### Edge Cases
- No PM history → Empty state message
- Export to Excel → Download compliance report

---

## 🚀 WORKFLOW 3: Machine Startup Reminder Workflow

### Test Case 3.1: Admin Configures Machine Startup Tasks

**Test ID**: TC-003-01  
**Priority**: High  
**Role**: Admin  
**Objective**: Configure startup checklist for machines

#### Test Data
```
Machine: CNC Machine 001
Startup Tasks:
  1. Power on main switch
  2. Check coolant level
  3. Initialize control system
  4. Home all axes
  5. Warm-up cycle (10 mins)
Reminder Lead Time: 2 hours before production
Notification Channels: WhatsApp + Email
```

#### Detailed Steps

**Step 1-3: Login and Navigate**
1. Login as admin_test
2. Navigate to: Admin Dashboard → Machines
3. Find "CNC Machine 001", Click "Edit"

**Step 4-6: Configure Startup Tasks**
4. Scroll to "Startup Configuration" section
5. Enable "Requires Startup Procedure"
6. Add 5 startup tasks (as listed in test data)

**Step 7-8: Set Reminder Settings**
7. Reminder Lead Time: `2` hours
8. Enable: WhatsApp + Email notifications

**Step 9: Save Configuration**
9. Click "Save Machine Settings"

**Expected**: Startup tasks configured for machine

---

### Test Case 3.2: Manager Schedules Production with Startup Reminder

**Test ID**: TC-003-02  
**Priority**: High  
**Role**: Manager  
**Objective**: Schedule production, system sends startup reminder

#### Test Data
```
Machine: CNC Machine 001
Production Start Time: Tomorrow 10:00 AM
Operator: operator_test
Reminder Time: Tomorrow 8:00 AM (2 hours before)
```

#### Detailed Steps

**Step 1-4: Schedule Production**
1. Login as manager_test
2. Navigate to: Production Scheduling
3. Create new schedule:
   - Machine: CNC Machine 001
   - Start Time: Tomorrow 10:00 AM
   - Operator: operator_test
4. Click "Schedule"

**Expected**: 
- Production scheduled
- System automatically calculates reminder time: Tomorrow 8:00 AM
- Operator will receive notification at 8:00 AM

---

### Test Case 3.3: Operator Receives and Completes Startup Tasks

**Test ID**: TC-003-03  
**Priority**: Critical  
**Role**: Operator  
**Objective**: Receive reminder, complete startup, confirm ready

#### Test Data
```
Notification Time: Tomorrow 8:00 AM
Tasks:
  1. Power on: ✓
  2. Coolant level: ✓
  3. Initialize system: ✓
  4. Home axes: ✓
  5. Warm-up: ✓ (10 mins)
Completion Time: 8:25 AM
```

#### Detailed Steps

**Step 1: Receive Notification (System Automatic)**
- At 8:00 AM, operator receives:
  - WhatsApp: "Startup reminder: CNC Machine 001 production at 10:00 AM. Complete startup tasks."
  - Email notification
  - In-app alert

**Step 2-3: Login and View Startup Tasks**
2. Login as operator_test (at 8:00 AM)
3. Dashboard shows alert: "Startup due for CNC Machine 001"
4. Click "Start Machine Startup"

**Step 4-8: Complete Startup Tasks**
4. Task 1 - Power on: Mark ✓
5. Task 2 - Coolant: Mark ✓
6. Task 3 - Initialize: Mark ✓
7. Task 4 - Home axes: Mark ✓
8. Task 5 - Warm-up: Mark ✓, Timer: 10 mins

**Step 9: Confirm Ready**
9. All tasks complete
10. Click "Confirm Machine Ready"

**Expected**:
- Status: Ready for Production
- Manager notified: "CNC Machine 001 ready for 10:00 AM production"
- Production can start on time

---

### Test Case 3.4: Manager Monitors Startup Completion

**Test ID**: TC-003-04  
**Priority**: Medium  
**Role**: Manager

#### Detailed Steps

**Step 1-3: Monitor Dashboard**
1. Login as manager_test at 8:30 AM
2. View: Production Dashboard
3. See: CNC Machine 001 - Status: Ready ✓

**Expected**: Real-time startup status visible

---

### Test Case 3.5: System Sends Overdue Notification (Missed Startup)

**Test ID**: TC-003-05  
**Priority**: High  
**Role**: System (Automatic)  
**Scenario**: Operator misses startup deadline

#### Test Data
```
Reminder: 8:00 AM
Production: 10:00 AM
Current Time: 9:00 AM
Startup Status: Not Started (overdue by 1 hour)
```

#### Detailed Steps

**Step 1: System Detects Overdue (Automatic)**
- At 9:00 AM (1 hour overdue), system:
  - Checks startup status: Not Started
  - Triggers escalation notification

**Step 2: Escalation Notifications Sent**
- WhatsApp to Operator: "URGENT: Startup overdue for CNC Machine 001"
- WhatsApp to Manager: "Alert: Operator has not started CNC Machine 001 startup (1 hour overdue)"
- Email to Manager

**Expected**: Immediate escalation to prevent production delay

---

## 📦 WORKFLOW 4: Inventory Management Workflow

### Test Case 4.1: Admin Configures Inventory Items

**Test ID**: TC-004-01  
**Priority**: High  
**Role**: Admin

#### Test Data
```
Raw Material:
  Name: Steel Plate 5mm
  Category: Raw Material
  UOM: Kilograms (kg)
  Current Stock: 500 kg
  Minimum Stock: 200 kg
  Reorder Level: 300 kg
  Unit Cost: ₹150/kg

Finished Good:
  Name: Hydraulic Cylinder HC-500
  Category: Finished Goods
  UOM: Units (pcs)
  Current Stock: 50 pcs
  Minimum Stock: 10 pcs
  Unit Cost: ₹5,000/pc
```

#### Detailed Steps

**Step 1-3: Add Raw Material**
1. Login as admin_test
2. Navigate to: Inventory Management → Raw Materials
3. Click "Add Raw Material"
4. Fill all fields as per test data
5. Click "Save"

**Expected**: Steel Plate 5mm added to inventory

**Step 6-10: Add Finished Good**
6. Navigate to: Inventory Management → Finished Goods
7. Click "Add Finished Good"
8. Fill: Hydraulic Cylinder HC-500 details
9. Click "Save"

**Expected**: Finished good added

---

### Test Case 4.2: Manager Issues Raw Material to Production

**Test ID**: TC-004-02  
**Priority**: High  
**Role**: Manager

#### Test Data
```
Material: Steel Plate 5mm
Quantity to Issue: 100 kg
Issued To: Production Line A
Job/Work Order: WO-2025-001
Purpose: "Manufacturing hydraulic cylinders"
```

#### Detailed Steps

**Step 1-4: Create Issuance**
1. Login as manager_test
2. Navigate to: Inventory → Raw Material Issuance
3. Click "Issue Material"
4. Select Material: Steel Plate 5mm
5. Quantity: 100 kg
6. Issued To: Production Line A
7. Work Order: WO-2025-001
8. Purpose: Manufacturing hydraulic cylinders

**Step 9: Save and Verify**
9. Click "Issue Material"

**Expected**:
- Issuance record created
- Inventory auto-deducted: 500 kg → 400 kg
- Transaction logged
- If quantity brings stock below reorder level (300 kg), alert triggered

**Validation**:
```sql
SELECT quantity FROM raw_materials WHERE name = 'Steel Plate 5mm';
-- Should show: 400
```

---

### Test Case 4.3: Operator Records Finished Goods Production

**Test ID**: TC-004-03  
**Priority**: Critical  
**Role**: Operator

#### Test Data
```
Product: Hydraulic Cylinder HC-500
Quantity Produced: 25 units
Work Order: WO-2025-001
Raw Materials Consumed:
  - Steel Plate 5mm: 100 kg (auto-calculated from BOM)
Production Date: Today
Shift: Morning
```

#### Detailed Steps

**Step 1-5: Record Production**
1. Login as operator_test
2. Navigate to: Production Management → Record Production
3. Work Order: WO-2025-001
4. Product: Hydraulic Cylinder HC-500
5. Quantity: 25 units
6. Shift: Morning

**Step 7: Submit Production Record**
7. Click "Submit Production"

**Expected**:
- Finished goods inventory increased: 50 → 75 units
- Raw material consumption linked to work order
- Production cost calculated automatically
- Manager notified of production completion

**Validation**:
```sql
SELECT quantity FROM finished_goods WHERE name = 'Hydraulic Cylinder HC-500';
-- Should show: 75
```

---

### Test Case 4.4: Manager Creates Purchase Order

**Test ID**: TC-004-04  
**Priority**: High  
**Role**: Manager

#### Test Data (triggered by low stock alert from TC-004-02)
```
Material: Steel Plate 5mm (current: 400 kg, reorder level: 300 kg)
Vendor: ABC Steel Suppliers
Order Quantity: 1000 kg
Unit Price: ₹150/kg
Total: ₹1,50,000
Expected Delivery: 7 days
Payment Terms: Net 30 days
```

#### Detailed Steps

**Step 1-3: Create PO from Alert**
1. Login as manager_test
2. Dashboard shows: "Low Stock Alert: Steel Plate 5mm (400 kg)"
3. Click "Create Purchase Order"

**Step 4-8: Fill PO Details**
4. Material: Steel Plate 5mm (pre-filled)
5. Vendor: Select "ABC Steel Suppliers"
6. Quantity: 1000 kg
7. Unit Price: ₹150/kg
8. Expected Delivery: [Today + 7 days]
9. Payment Terms: Net 30 days

**Step 10: Save and Send PO**
10. Click "Create PO"

**Expected**:
- PO number generated: PO-2025-001
- Status: Sent
- Vendor notified (email)
- PO printable for vendor signature

---

## 🚚 WORKFLOW 5: Sales & Dispatch Workflow (Complete 5-Stage)

### Test Case 5.1: Admin Creates Invoice Template

**Test ID**: TC-005-01  
**Priority**: High  
**Role**: Admin

#### Test Data
```
Template Name: Standard GST Invoice
Seller Details:
  Company: KINTO Manufacturing Ltd.
  GSTIN: 29ABCDE1234F1Z5
  Address: 123 Industrial Area, Bangalore - 560001
  Phone: +91-9876543210
  Email: sales@kinto.com
Bank Details:
  Bank: HDFC Bank
  Account: 1234567890
  IFSC: HDFC0001234
  Branch: Koramangala, Bangalore
Terms & Conditions:
  1. Payment due within 30 days
  2. Goods once sold cannot be returned
  3. Subject to Bangalore jurisdiction
Logo: [Upload company logo]
```

#### Detailed Steps

**Step 1-3: Create Template**
1. Login as admin_test
2. Navigate to: Invoice Templates
3. Click "Create Template"

**Step 4-10: Fill Template Details**
4-10. Fill all seller details, bank info, T&C as per test data

**Step 11: Save Template**
11. Click "Save Template"

**Expected**: Template available for invoice creation

---

### Test Case 5.2: Manager Creates Sales Invoice (Stage 1: Invoice Creation)

**Test ID**: TC-005-02  
**Priority**: Critical  
**Role**: Manager  
**Dispatch Stage**: 1 of 5

#### Test Data
```
Template: Standard GST Invoice
Invoice Number: INV-2025-001 (auto-generated)
Invoice Date: Today
Customer Details:
  Name: XYZ Industries Pvt Ltd
  GSTIN: 29XYZAB5678C1D2
  Billing Address: 456 Market Road, Bangalore - 560002
  Ship To: Same as billing
  Contact: Ramesh Kumar
  Phone: +91-9988776655
  Email: purchase@xyzind.com
  
Items:
  1. Hydraulic Cylinder HC-500
     Quantity: 10 units
     HSN Code: 84122100
     Unit Price: ₹5,000
     Subtotal: ₹50,000
     
Tax Calculation (Intra-state Karnataka):
  Subtotal: ₹50,000
  CGST @ 9%: ₹4,500
  SGST @ 9%: ₹4,500
  Total: ₹59,000

Payment Terms: Net 30 days
Due Date: [Today + 30 days]
```

#### Detailed Steps

**Step 1-4: Create Invoice**
1. Login as manager_test
2. Navigate to: Sales Invoices
3. Click "Create Invoice"
4. Select Template: Standard GST Invoice

**Step 5-10: Fill Customer Details**
5-10. Enter all customer information (name, GSTIN, address, contact)

**Step 11-14: Add Invoice Items**
11. Click "Add Item"
12. Product: Hydraulic Cylinder HC-500
13. Quantity: 10 units
14. Unit Price: ₹5,000 (auto-filled from product master)
15. HSN Code: 84122100 (auto-filled)

**Step 15: Verify Tax Calculation**
15. System auto-calculates:
    - Detects same state (Karnataka) → CGST + SGST
    - Subtotal: ₹50,000
    - CGST 9%: ₹4,500
    - SGST 9%: ₹4,500
    - **Total: ₹59,000**

**Step 16-17: Set Payment Terms**
16. Payment Terms: Net 30 days
17. Due Date: [Auto-calculated: Today + 30 days]

**Step 18: Save Invoice**
18. Click "Create Invoice"

**Expected**:
- ✅ **Invoice Created**
- ✅ **Status: DRAFT** (Stage 1/5)
- ✅ Invoice Number: INV-2025-001
- ✅ Total: ₹59,000
- ✅ **NO inventory deduction** (invoice is sales document only)
- ✅ Can be edited/deleted
- ✅ Printable
- ✅ Next action: "Generate Gatepass"

**Critical Validation**:
```sql
SELECT status, total_amount FROM invoices WHERE invoice_number = 'INV-2025-001';
-- Status: draft, Total: 59000

SELECT quantity FROM finished_goods WHERE name = 'Hydraulic Cylinder HC-500';
-- Should STILL be 75 (NO deduction yet)
```

---

### Test Case 5.3: Manager Generates Gatepass from Invoice (Stage 2: Gatepass Generation)

**Test ID**: TC-005-03  
**Priority**: Critical  
**Role**: Manager  
**Dispatch Stage**: 2 of 5

#### Prerequisites
- ✅ Test Case 5.2 completed
- ✅ Invoice INV-2025-001 status: draft
- ✅ Inventory: 75 units available

#### Test Data
```
Invoice: INV-2025-001
Gatepass Number: GP-2025-001 (auto-generated)
Vehicle Details:
  Vehicle Number: KA-01-AB-1234
  Driver Name: Suresh Kumar
  Driver Contact: +91-9876543210
Transport Details:
  Transporter: ABC Logistics
  LR Number: LR-2025-001
  Cases: 2 cases
  Seal Numbers: SEAL-001, SEAL-002
  Gross Weight: 250 kg
```

#### Detailed Steps

**Step 1-3: Open Invoice and Generate Gatepass**
1. Login as manager_test (if not already)
2. Navigate to: Sales Invoices
3. Find invoice: INV-2025-001 (Status: Draft)
4. Click "Generate Gatepass" button (data-testid="button-generate-gatepass")

**Expected**: Gatepass form opens with items auto-populated from invoice

**Step 5-7: Verify Items Auto-Populated**
5. Gatepass form shows:
   - Linked Invoice: INV-2025-001
   - Customer: XYZ Industries Pvt Ltd
   - Items:
     * Hydraulic Cylinder HC-500: 10 units ✓ (from invoice)
6. Items are pre-filled, cannot be modified
7. Total matches invoice

**Step 8-13: Fill Vehicle & Transport Details**
8. Vehicle Number: KA-01-AB-1234
9. Driver Name: Suresh Kumar
10. Driver Contact: +91-9876543210
11. Transporter: ABC Logistics
12. LR Number: LR-2025-001
13. Cases: 2, Seal Numbers: SEAL-001, SEAL-002
14. Gross Weight: 250 kg

**Step 15: Create Gatepass**
15. Click "Create Gatepass"

**Expected**:
- ✅ **Gatepass Created**: GP-2025-001
- ✅ **Gatepass Status: GENERATED** (Stage 2/5)
- ✅ **Invoice Status: draft → READY_FOR_GATEPASS**
- ✅ **INVENTORY DEDUCTED NOW**: 75 → 65 units (physical dispatch)
- ✅ One-to-one link: Invoice ↔ Gatepass
- ✅ Gatepass printable for security gate
- ✅ Next action: "Record Vehicle Exit"

**Critical Validation**:
```sql
SELECT status FROM invoices WHERE invoice_number = 'INV-2025-001';
-- Status: ready_for_gatepass

SELECT status FROM gatepasses WHERE gatepass_number = 'GP-2025-001';
-- Status: generated

SELECT quantity FROM finished_goods WHERE name = 'Hydraulic Cylinder HC-500';
-- Should NOW be 65 (deducted 10 units)
```

**Backend Enforcement**:
- ✅ POST /api/gatepasses validates invoiceId is present (returns 400 if missing)
- ✅ One gatepass per invoice (cannot create duplicate)
- ✅ Inventory deduction happens atomically with gatepass creation

---

### Test Case 5.4: Operator Records Vehicle Exit (Stage 3: Vehicle Out)

**Test ID**: TC-005-04  
**Priority**: Critical  
**Role**: Operator (Security)  
**Dispatch Stage**: 3 of 5

#### Prerequisites
- ✅ Test Case 5.3 completed
- ✅ Gatepass GP-2025-001 status: generated
- ✅ Invoice INV-2025-001 status: ready_for_gatepass

#### Test Data
```
Gatepass: GP-2025-001
Security Verification:
  - Vehicle Number verified: KA-01-AB-1234 ✓
  - Seal numbers checked: SEAL-001, SEAL-002 ✓
  - Cases count: 2 ✓
  - Documents complete: Invoice + Gatepass ✓
Exit Time: [Current timestamp]
Security Officer: operator_test
```

#### Detailed Steps

**Step 1-4: Security Gate - Vehicle Arrival**
1. Login as operator_test (Security role)
2. Navigate to: Dispatch Tracking → Gate Passes
3. Filter: Status = Generated (ready for dispatch)
4. Find: GP-2025-001

**Expected**: Gatepass visible in "Ready to Dispatch" list

**Step 5-7: Open Gatepass and Verify**
5. Click "Record Vehicle Exit" (data-testid="button-vehicle-exit-[id]")
6. System shows gatepass details:
   - Vehicle: KA-01-AB-1234
   - Driver: Suresh Kumar
   - Items: 10 units Hydraulic Cylinder
   - Cases: 2
   - Seals: SEAL-001, SEAL-002
7. Security officer verifies physically:
   - Vehicle number matches
   - Seals intact
   - Cases count correct
   - Documents present

**Expected**: All details match physical verification

**Step 8-10: Record Exit**
8. Check confirmation: "All details verified ✓"
9. Current time auto-populated: [timestamp]
10. Click "Confirm Vehicle Exit"

**Expected**:
- ✅ **Gatepass Status: generated → VEHICLE_OUT** (Stage 3/5)
- ✅ **Invoice Status: ready_for_gatepass → DISPATCHED**
- ✅ Exit timestamp recorded
- ✅ Security officer ID logged
- ✅ Cannot record exit twice (validation prevents)
- ✅ Next action: "Record Proof of Delivery" (when customer receives)

**Critical Validation**:
```sql
SELECT status, vehicle_exit_time FROM gatepasses WHERE gatepass_number = 'GP-2025-001';
-- Status: vehicle_out, Exit time: [timestamp]

SELECT status FROM invoices WHERE invoice_number = 'INV-2025-001';
-- Status: dispatched
```

**Backend Enforcement**:
- ✅ PATCH /api/gatepasses/:id/vehicle-exit requires status="generated"
- ✅ Returns 400 if already recorded or invalid state
- ✅ Updates both gatepass and linked invoice statuses atomically

---

### Test Case 5.5: Manager/Operator Records Proof of Delivery (Stage 4: POD + Delivery Confirmation)

**Test ID**: TC-005-05  
**Priority**: Critical  
**Role**: Manager or Operator  
**Dispatch Stage**: 4 & 5 of 5 (Final Stages)

#### Prerequisites
- ✅ Test Case 5.4 completed
- ✅ Gatepass GP-2025-001 status: vehicle_out
- ✅ Invoice INV-2025-001 status: dispatched
- ✅ Goods physically delivered to customer

#### Test Data
```
Gatepass: GP-2025-001
Delivery Confirmation:
  - Customer received goods: Yes ✓
  - Delivered Date/Time: [timestamp]
  - Received By: Ramesh Kumar (Customer contact)
  - Cases delivered: 2 (all)
  - Seals intact: Yes ✓
  - Customer Signature: [Digital signature capture]
  - Delivery Notes: "Goods received in good condition"
```

#### Detailed Steps

**Step 1-4: Navigate to POD Screen**
1. Login as manager_test or operator_test
2. Navigate to: Dispatch Tracking → Proof of Delivery tab
3. Filter: Status = Vehicle Out (awaiting POD)
4. Find: GP-2025-001

**Expected**: Gatepass visible in "Awaiting Delivery Confirmation" list

**Step 5-7: Open POD Form**
5. Click "Record POD" (data-testid="button-record-pod-[id]")
6. POD form opens showing:
   - Gatepass: GP-2025-001
   - Invoice: INV-2025-001
   - Customer: XYZ Industries
   - Items: 10 units Hydraulic Cylinder
   - Dispatched: [exit timestamp]
7. Form fields:
   - Delivered Date/Time (auto: now)
   - Received By (customer name)
   - Cases Delivered
   - Seals Status
   - **Signature Canvas** (draw signature)
   - Delivery Notes

**Step 8-12: Fill POD Details**
8. Delivered Date/Time: [Auto: current timestamp]
9. Received By: Ramesh Kumar
10. Cases Delivered: 2 (matches dispatched)
11. Seals Intact: Yes ✓
12. Delivery Notes: "Goods received in good condition"

**Step 13-15: Capture Digital Signature**
13. Signature Canvas displayed (HTML5 canvas)
14. Customer signs on tablet/touchscreen or manager draws signature
15. Signature preview shows (base64 image data)

**Expected**: Signature captured, minimum length validation (100 chars base64)

**Step 16: Submit POD**
16. Click "Submit Proof of Delivery"

**Expected**:
- ✅ **Gatepass Status: vehicle_out → DELIVERED** (Stage 4/5)
- ✅ **Invoice Status: dispatched → DELIVERED** (Stage 5/5 - COMPLETE)
- ✅ Delivery timestamp recorded
- ✅ Signature saved (base64 image in database)
- ✅ POD document generated (printable)
- ✅ **Workflow COMPLETE** - all 5 stages done
- ✅ Can view/print POD with signature
- ✅ Payment tracking begins (invoice due in 30 days)

**Critical Validation**:
```sql
SELECT status, delivered_at, signature FROM gatepasses WHERE gatepass_number = 'GP-2025-001';
-- Status: delivered, Delivered_at: [timestamp], Signature: [base64...]

SELECT status FROM invoices WHERE invoice_number = 'INV-2025-001';
-- Status: delivered

-- Signature validation:
-- Length should be > 100 characters (base64 data)
-- Format: data:image/png;base64,iVBORw0KG...
```

**Backend Enforcement**:
- ✅ PATCH /api/gatepasses/:id/pod requires status="vehicle_out"
- ✅ Returns 400 if:
  - Status not vehicle_out
  - Signature missing or invalid
  - Signature too short (< 100 chars)
  - Signature format invalid (not base64 image)
- ✅ Multi-layer validation:
  - Format check (data:image/png;base64,)
  - Minimum length (100+ chars)
  - Base64 content verification (50+ chars after prefix)
- ✅ Updates both gatepass and invoice statuses atomically
- ✅ Cannot submit empty signature (validation prevents)

**Edge Cases to Test**:
- **Empty Signature**: Try submitting without signature → Error "Signature required"
- **Very Short Signature**: Draw tiny dot → Error "Please provide a valid signature"
- **Invalid Format**: Manually set signature to "abc123" → Error "Invalid signature format"
- **Network Failure**: Disconnect during submit → Error, retry available

---

## 📊 Complete 5-Stage Dispatch Flow Summary

**Status Progression**:

| Stage | Actor | Action | Invoice Status | Gatepass Status | Inventory |
|-------|-------|--------|----------------|-----------------|-----------|
| 1 | Manager | Create Invoice | **draft** | - | No change (75) |
| 2 | Manager | Generate Gatepass | **ready_for_gatepass** | **generated** | **Deducted (65)** |
| 3 | Operator | Vehicle Exit | **dispatched** | **vehicle_out** | Still 65 |
| 4 | Manager/Op | Record POD | **delivered** | **delivered** | Still 65 |
| 5 | System | Complete | **delivered** (final) | **delivered** (final) | Still 65 |

**Key Business Rules**:
1. ✅ Invoice creation does NOT deduct inventory (just a sales document)
2. ✅ Gatepass creation DEDUCTS inventory (physical dispatch from warehouse)
3. ✅ One invoice → One gatepass (enforced by backend)
4. ✅ Cannot create gatepass without invoice (400 error)
5. ✅ Cannot skip stages (strict status preconditions)
6. ✅ Digital signature required for POD (multi-layer validation)
7. ✅ All status transitions are atomic (database integrity)

---

**This completes Workflows 2-5 in full detail. Continuing with Workflows 6-15...**

## 👥 WORKFLOW 6: User & Role Management

### Test Case 6.1: Admin Creates New User

**Test ID**: TC-006-01  
**Priority**: High  
**Role**: Admin

#### Test Data
```
Username: qa_engineer
Email: qa@kinto.com
Full Name: QA Engineer
Password: QA@Engineer123
Role: reviewer
Status: Active
```

#### Detailed Steps

**Step 1-5: Create User**
1. Login as admin_test
2. Navigate to: User Management
3. Click "Add User"
4. Fill all fields from test data
5. Click "Create User"

**Expected**:
- User created successfully
- Appears in user list
- Can login with credentials
- Has reviewer permissions only

#### Edge Cases
- Duplicate username → Error "Username already exists"
- Weak password → Error "Password must contain uppercase, lowercase, number, special char"
- Invalid email → Error "Invalid email format"

---

### Test Case 6.2: Admin Configures Role Permissions

**Test ID**: TC-006-02  
**Priority**: Critical  
**Role**: Admin

#### Test Data
```
Role: reviewer
Screens to configure:
  1. Dashboard: View only
  2. Checklists: View + Edit (review)
  3. PM History: View only
  4. User Management: No access
  5. Machines: View only
  ... (all 26 screens)
```

#### Detailed Steps

**Step 1-5: Configure Permissions**
1. Login as admin_test
2. Navigate to: Role Management
3. Select Role: Reviewer
4. For each of 26 screens, set permissions:
   - View: ✓/✗
   - Create: ✓/✗
   - Edit: ✓/✗
   - Delete: ✓/✗
5. Click "Save Permissions"

**Expected**:
- Permissions saved
- Reviewer users see only permitted screens
- Unauthorized access returns 403

#### Edge Cases
- Remove all permissions → Warning "Role must have at least dashboard access"

---

### Test Case 6.3: Manager Deactivates User

**Test ID**: TC-006-03  
**Priority**: Medium  
**Role**: Manager

#### Detailed Steps

**Step 1-4: Deactivate User**
1. Login as manager_test
2. Navigate to: User Management
3. Find user: qa_engineer
4. Click "Deactivate"
5. Confirm action

**Expected**:
- User status: Active → Inactive
- User cannot login
- Existing sessions terminated
- Assigned tasks reassigned or flagged

---

## 📊 WORKFLOW 7: Reporting & Analytics

### Test Case 7.1: Manager Views Sales Dashboard

**Test ID**: TC-007-01  
**Priority**: High  
**Role**: Manager

#### Test Data
```
Time Period: Last 30 days
Expected Metrics:
  - Total Revenue: ₹5,90,000
  - Total Orders: 10
  - Average Order Value: ₹59,000
  - Goods Sold: 100 units
```

#### Detailed Steps

**Step 1-5: View Dashboard**
1. Login as manager_test
2. Navigate to: Sales Dashboard
3. Select filter: Last 30 days
4. View metrics:
   - Revenue card shows ₹5,90,000
   - Orders card shows 10
   - AOV card shows ₹59,000
   - Goods sold shows 100 units
5. View charts:
   - Revenue trend line chart
   - Product-wise sales pie chart

**Expected**:
- All metrics accurate
- Charts render correctly
- Data matches invoice records

#### Edge Cases
- No data → Empty state message
- Different time periods: Today, Week, Month, Quarter, Year

---

### Test Case 7.2: Admin Generates GST Reports

**Test ID**: TC-007-02  
**Priority**: Critical  
**Role**: Admin

#### Test Data
```
Report Type: GSTR-1
Period: January 2025
Expected Data:
  B2B Invoices (with GSTIN): 8 invoices
  B2C Invoices (no GSTIN): 2 invoices
  Total Tax Collected: ₹53,100
  HSN Summary: 5 HSN codes
```

#### Detailed Steps

**Step 1-7: Generate GSTR-1**
1. Login as admin_test
2. Navigate to: Reports → GST Reports
3. Select Report: GSTR-1
4. Period: January 2025
5. Click "Generate Report"
6. Review:
   - B2B section: 8 invoices with GSTIN details
   - B2C section: 2 invoices aggregated
   - HSN summary with tax breakup
   - Total CGST, SGST, IGST amounts
7. Click "Export to Excel"

**Expected**:
- Excel file downloaded
- Format matches GSTIN portal requirements
- All mandatory fields present
- Ready for government filing

---

## 🔔 WORKFLOW 8: Missed Checklist Notification Workflow

### Test Case 8.1: System Detects Missed Checklist

**Test ID**: TC-008-01  
**Priority**: High  
**Role**: System (Automatic)

#### Scenario
```
Checklist assigned to operator_test
Due Date: Today 6:00 PM
Current Time: Today 6:30 PM (30 mins overdue)
Status: Pending (not started)
```

#### System Behavior

**Automatic Detection (6:30 PM)**
- System cron job runs every 15 minutes
- Detects checklist overdue by 30 mins
- Triggers notification cascade

**Notifications Sent**:
1. WhatsApp to Operator: "OVERDUE: Daily Quality Inspection - Due 6:00 PM"
2. Email to Operator
3. WhatsApp to Reviewer: "Alert: Operator has not started checklist (30 mins overdue)"
4. Email to Manager: "Escalation: Checklist missed - Daily Quality Inspection"

**Expected**: Multi-level notification sent automatically

---

### Test Case 8.2: Operator Completes Overdue Checklist

**Test ID**: TC-008-02  
**Priority**: High  
**Role**: Operator

#### Detailed Steps

**Step 1-5: Complete Late**
1. Operator receives alert at 6:30 PM
2. Login as operator_test
3. See red "OVERDUE" badge on checklist
4. Complete checklist at 7:00 PM (1 hour late)
5. System records:
   - Due: 6:00 PM
   - Completed: 7:00 PM
   - Delay: 1 hour

**Expected**:
- Checklist marked complete
- Delay time recorded
- Manager notified of late completion
- Compliance report flags late submission

---

### Test Case 8.3: Manager Reviews Late Completion Report

**Test ID**: TC-008-03  
**Priority**: Medium  
**Role**: Manager

#### Detailed Steps

**Step 1-4: Review Compliance**
1. Login as manager_test
2. Navigate to: Reports → Compliance
3. Filter: Overdue checklists, Last 7 days
4. See: Daily Quality Inspection - Delay: 1 hour

**Expected**: Late submissions tracked for performance review

---

## 💰 WORKFLOW 9: Payment Tracking & FIFO Allocation

### Test Case 9.1: Customer Makes Partial Payment

**Test ID**: TC-009-01  
**Priority**: High  
**Role**: Manager

#### Test Data
```
Invoice: INV-2025-001
Total: ₹59,000
Payment Received: ₹30,000 (partial)
Payment Method: Bank Transfer
Reference: TXN-ABC123
Payment Date: Today
```

#### Detailed Steps

**Step 1-7: Record Payment**
1. Login as manager_test
2. Navigate to: Invoices → INV-2025-001
3. Click "Record Payment"
4. Amount: ₹30,000
5. Method: Bank Transfer
6. Reference: TXN-ABC123
7. Click "Save Payment"

**Expected**:
- Payment recorded
- Invoice status: Partially Paid
- Outstanding: ₹29,000
- Payment history shows transaction

---

### Test Case 9.2: FIFO Payment Allocation (Multiple Invoices)

**Test ID**: TC-009-02  
**Priority**: Critical  
**Role**: Manager

#### Test Data
```
Customer: XYZ Industries
Outstanding Invoices:
  1. INV-2025-001 (Jan 15): ₹29,000 remaining
  2. INV-2025-002 (Jan 20): ₹45,000 outstanding
  3. INV-2025-003 (Jan 25): ₹60,000 outstanding
Total Outstanding: ₹1,34,000

Payment Received: ₹50,000
```

#### Expected FIFO Allocation
```
₹50,000 applied in chronological order:
1. INV-2025-001 gets ₹29,000 → FULLY PAID ✓
2. INV-2025-002 gets ₹21,000 → Partial (₹24,000 remaining)
3. INV-2025-003 gets ₹0 → Still ₹60,000 outstanding
```

#### Detailed Steps

**Step 1-5: Record Payment with FIFO**
1. Navigate to: Customer → XYZ Industries → Payments
2. Click "Record Payment"
3. Amount: ₹50,000
4. System shows FIFO preview:
   - INV-2025-001: ₹29,000 (full payment)
   - INV-2025-002: ₹21,000 (partial)
5. Confirm allocation
6. Click "Save Payment"

**Expected**:
- Payment auto-allocated using FIFO
- INV-2025-001 status: Paid ✓
- INV-2025-002 status: Partially Paid (₹24,000 due)
- INV-2025-003 status: Unpaid (₹60,000 due)
- Payment receipt generated

---

### Test Case 9.3: Manager Generates Payment Aging Report

**Test ID**: TC-009-03  
**Priority**: High  
**Role**: Manager

#### Expected Report
```
Customer: XYZ Industries
0-30 days: ₹24,000 (INV-2025-002)
31-60 days: ₹0
61-90 days: ₹0
90+ days: ₹0
Total Outstanding: ₹84,000
```

#### Detailed Steps

**Step 1-4: View Aging**
1. Navigate to: Reports → Payment Aging
2. Select Customer: XYZ Industries
3. View aging buckets
4. Export to Excel

**Expected**: Aging report shows outstanding by time period

---

### Test Case 9.4: System Sends Payment Reminder

**Test ID**: TC-009-04  
**Priority**: Medium  
**Role**: System (Automatic)

#### Scenario
```
Invoice: INV-2025-002
Due Date: Feb 19, 2025
Current Date: Feb 20, 2025 (1 day overdue)
Outstanding: ₹24,000
```

#### System Behavior

**Automatic Reminder (Feb 20)**
- Email to Customer: "Payment reminder - INV-2025-002 overdue by 1 day"
- Copy to Manager
- Dashboard shows in "Overdue Payments" widget

**7 Days Overdue (Feb 27)**
- Escalation email: "URGENT: Payment 7 days overdue"
- Manager alerted

**Expected**: Automatic payment reminders at 1, 7, 15, 30 days overdue

---

### Test Case 9.5: Manager Exports Payment Register

**Test ID**: TC-009-05  
**Priority**: Medium  
**Role**: Manager

#### Expected Export
```
All payments for: January 2025
Format: Excel
Columns:
  - Payment Date
  - Invoice Number
  - Customer
  - Amount
  - Method
  - Reference
  - Status
```

#### Detailed Steps

**Step 1-4: Export Register**
1. Navigate to: Reports → Payment Register
2. Period: January 2025
3. Click "Export to Excel"
4. File downloads

**Expected**: Complete payment log for accounting

---

## 🔧 WORKFLOW 10: Spare Parts Management

### Test Case 10.1: Admin Adds Spare Part

**Test ID**: TC-010-01  
**Priority**: High  
**Role**: Admin

#### Test Data
```
Part Name: Hydraulic Seal Kit
Part Number: HSK-2500
Category: Seals & Gaskets
UOM: Kit
Min Stock: 5 kits
Current Stock: 20 kits
Unit Cost: ₹1,200
Compatible Machines:
  - Hydraulic Press 01
  - Hydraulic Press 02
```

#### Detailed Steps

**Step 1-6: Add Part**
1. Login as admin_test
2. Navigate to: Inventory → Spare Parts
3. Click "Add Spare Part"
4. Fill all fields
5. Link to machines: Hydraulic Press 01, 02
6. Click "Save"

**Expected**: Part added, visible in spare parts inventory

---

### Test Case 10.2: Operator Uses Spare Part During PM

**Test ID**: TC-010-02  
**Priority**: Critical  
**Role**: Operator

#### Scenario
```
PM Execution: Monthly Hydraulic Check
Required Part: Hydraulic Seal Kit (1 kit)
Current Stock: 20 kits
```

#### Detailed Steps

**Step 1-5: Use Part**
1. During PM execution (from Test Case 2.3)
2. Step: "Replace hydraulic seals"
3. Select spare part: Hydraulic Seal Kit
4. Quantity: 1 kit
5. Submit PM

**Expected**:
- Part usage recorded
- Inventory auto-deducted: 20 → 19 kits
- Part cost added to PM cost
- Usage history tracked

---

### Test Case 10.3: Manager Creates Spare Parts Purchase Order

**Test ID**: TC-010-03  
**Priority**: High  
**Role**: Manager

#### Test Data (triggered by low stock)
```
Part: Hydraulic Seal Kit
Current Stock: 4 kits (below min: 5)
Vendor: Seals & More Suppliers
Order Quantity: 20 kits
Unit Price: ₹1,200
Total: ₹24,000
```

#### Detailed Steps

**Step 1-6: Create PO**
1. Login as manager_test
2. Dashboard alert: "Low stock: Hydraulic Seal Kit"
3. Click "Create PO"
4. Fill vendor, quantity, price
5. Click "Create PO"

**Expected**: PO created for spare parts replenishment

---

### Test Case 10.4: Manager Receives and Updates Stock

**Test ID**: TC-010-04  
**Priority**: High  
**Role**: Manager

#### Test Data
```
PO: PO-SP-2025-001
Ordered: 20 kits
Received: 20 kits
Received Date: Today
Quality Check: Pass
```

#### Detailed Steps

**Step 1-6: Receive Stock**
1. Navigate to: Purchase Orders → PO-SP-2025-001
2. Status: Sent
3. Click "Receive Stock"
4. Quantity received: 20 kits
5. Quality: Pass
6. Click "Confirm Receipt"

**Expected**:
- PO status: Received
- Stock updated: 4 → 24 kits
- Vendor invoice pending
- Payment due tracked

---

## ⚙️ WORKFLOW 11: Notification System Configuration

### Test Case 11.1: Admin Configures Notifications

**Test ID**: TC-011-01  
**Priority**: High  
**Role**: Admin

#### Test Data
```
WhatsApp Settings:
  Enabled: Yes
  Twilio Account SID: [from secrets]
  Twilio Auth Token: [from secrets]
  From Number: +1234567890
  
Email Settings:
  Enabled: Yes
  SendGrid API Key: [from secrets]
  From Email: noreply@kinto.com
  
Notification Triggers:
  1. Checklist assigned → Notify operator
  2. Checklist submitted → Notify reviewer
  3. Low stock → Notify manager
  4. PM overdue → Notify operator + manager
  5. Payment overdue → Notify manager
  
Reminder Timing:
  Machine startup: 2 hours before
  Checklist deadline: 1 hour before
  Payment due: 7 days before
```

#### Detailed Steps

**Step 1-8: Configure All Settings**
1. Login as admin_test
2. Navigate to: Notification Settings
3. Enable WhatsApp, configure Twilio credentials
4. Enable Email, configure SendGrid
5. For each trigger, set:
   - Enabled: Yes/No
   - Recipients: Roles to notify
   - Template: Message format
6. Set reminder timings
7. Test notifications (send test message)
8. Click "Save Settings"

**Expected**:
- Notifications configured
- Test messages received
- System sends alerts for configured events

---

## 🖨️ WORKFLOW 12: Printing & Document Export

### Test Case 12.1: Manager Prints Sales Invoice

**Test ID**: TC-012-01  
**Priority**: High  
**Role**: Manager

#### Detailed Steps

**Step 1-5: Print Invoice**
1. Login as manager_test
2. Navigate to: Sales Invoices
3. Find: INV-2025-001
4. Click "Print" button
5. Print preview opens showing:
   - Company logo
   - GST details
   - Invoice number, date
   - Customer details
   - Itemized list with HSN codes
   - Tax breakdown (CGST, SGST, IGST)
   - Total in words
   - Bank details
   - Terms & conditions
   - Authorized signatory
6. Press Ctrl+P or click "Print"
7. Save as PDF or print physically

**Expected**: Professional A4 invoice ready for customer

---

### Test Case 12.2: Operator Prints Gatepass

**Test ID**: TC-012-02  
**Priority**: High  
**Role**: Operator

#### Detailed Steps

**Step 1-5: Print Gatepass**
1. Login as operator_test
2. Navigate to: Dispatch Tracking → Gatepasses
3. Find: GP-2025-001
4. Click "Print Gatepass"
5. Preview shows:
   - Company branding
   - Gatepass number, date
   - Vehicle details
   - Customer/destination
   - Items with quantities
   - Cases, seals
   - Signature blocks
6. Print for security gate

**Expected**: Gatepass document for gate security

---

### Test Case 12.3: Manager Prints Purchase Order

**Test ID**: TC-012-03  
**Priority**: Medium  
**Role**: Manager

#### Detailed Steps

**Step 1-4: Print PO**
1. Navigate to: Purchase Orders → PO-2025-001
2. Click "Print"
3. Preview shows complete PO with T&C
4. Print for vendor

**Expected**: Professional PO document

---

### Test Case 12.4: Admin Exports GST Report to Excel

**Test ID**: TC-012-04  
**Priority**: Critical  
**Role**: Admin

#### Detailed Steps

**Step 1-5: Export GSTR-1**
1. Navigate to: Reports → GST Reports
2. Select: GSTR-1, Period: January 2025
3. Click "Generate Report"
4. Review on-screen
5. Click "Export to Excel"

**Expected**:
- Excel file downloaded
- GSTIN portal compatible format
- All fields complete

---

### Test Case 12.5: Manager Exports Inventory Report to JSON

**Test ID**: TC-012-05  
**Priority**: Low  
**Role**: Manager

#### Detailed Steps

**Step 1-4: Export JSON**
1. Navigate to: Reports → Inventory
2. Select: Current Stock Levels
3. Click "Generate Report"
4. Click "Export to JSON"

**Expected**: JSON file with inventory data

---

### Test Case 12.6: Manager Prints Raw Material Issuance Report

**Test ID**: TC-012-06  
**Priority**: Medium  
**Role**: Manager

#### Detailed Steps

**Step 1-5: Print Report**
1. Navigate to: Reports → Operational
2. Type: Raw Material Issuance
3. Date: Last 7 days
4. Generate report
5. Print

**Expected**: Issuance report with company branding

---

### Test Case 12.7: Manager Prints PM Execution Report

**Test ID**: TC-012-07  
**Priority**: Medium  
**Role**: Manager

#### Detailed Steps

**Step 1-4: Print PM Report**
1. Navigate to: PM History
2. Find completed PM
3. Click "View Details" → "Print Report"
4. Report shows:
   - Machine, PM template
   - Tasks completed
   - Parts used
   - Time taken
5. Print for compliance

**Expected**: PM completion certificate

---

## 🚨 WORKFLOW 13: System Alerts & Notifications

### Test Case 13.1: System Sends Low Stock Alert

**Test ID**: TC-013-01  
**Priority**: High  
**Role**: System (Automatic)

#### Scenario
```
Material: Steel Plate 5mm
Min Stock: 200 kg
Reorder Level: 300 kg
Current Stock: 250 kg
After Issuance: 150 kg (below reorder level)
```

#### System Behavior

**Automatic Detection**
1. Manager issues 100 kg for production
2. Stock drops: 250 → 150 kg
3. System detects: 150 < 300 (reorder level)
4. Triggers low stock alert

**Notifications Sent**:
- WhatsApp to Manager: "LOW STOCK: Steel Plate 5mm - Current: 150kg, Min: 300kg"
- Email to Admin
- Dashboard shows red alert badge

**Expected**: Immediate notification for reordering

---

### Test Case 13.2: Manager Responds to Low Stock Alert

**Test ID**: TC-013-02  
**Priority**: High  
**Role**: Manager

#### Detailed Steps

**Step 1-5: Create PO from Alert**
1. Manager receives WhatsApp alert
2. Login, see dashboard: "3 items below reorder level"
3. Click alert
4. View: Steel Plate 5mm: 150 kg (Min: 300 kg)
5. Click "Create PO"
6. System pre-fills:
   - Material: Steel Plate 5mm
   - Suggested Qty: 1000 kg
   - Last vendor
7. Complete and submit PO

**Expected**:
- PO created from alert
- Stock replenishment initiated

---

### Test Case 13.3: System Sends PM Overdue Alert

**Test ID**: TC-013-03  
**Priority**: High  
**Role**: System (Automatic)

#### Scenario
```
PM: Monthly Hydraulic Check
Due: Jan 15, 2025
Current: Jan 16, 2025 (1 day overdue)
Status: Scheduled (not executed)
```

#### System Behavior

**Overdue Detection (Jan 16)**
- System checks PM schedule daily
- Detects 1 day overdue
- Sends escalation:
  - WhatsApp to Operator
  - Email to Manager
  - Dashboard: Red "Overdue" badge

**Expected**: Immediate escalation for compliance

---

### Test Case 13.4: Manager Views System Alerts Dashboard

**Test ID**: TC-013-04  
**Priority**: Medium  
**Role**: Manager

#### Detailed Steps

**Step 1-6: Monitor Alerts**
1. Login as manager_test
2. Navigate to: System Alerts
3. View summary:
   - Low Stock: 3 items
   - Overdue PMs: 2 tasks
   - Overdue Checklists: 1
   - Pending Approvals: 5
4. Filter by type, priority, date
5. Click alert to view details
6. Take action (create PO, escalate, etc.)

**Expected**: Centralized alert management

---

### Test Case 13.5: System Sends Payment Reminder

**Test ID**: TC-013-05  
**Priority**: Medium  
**Role**: System (Automatic)

#### Scenario
```
Invoice: INV-2025-001
Due Date: Jan 31, 2025
Current: Feb 1, 2025 (1 day overdue)
Outstanding: ₹59,000
```

#### System Behavior

**1 Day Overdue (Feb 1)**
- Email to Manager
- Dashboard shows overdue payment

**7 Days Overdue (Feb 8)**
- WhatsApp: "URGENT: Payment 7 days overdue - ₹59,000"
- Email to Admin

**Expected**: Payment aging alerts at 1, 7, 15, 30 days

---

### Test Case 13.6: Operator Acknowledges and Resolves Alert

**Test ID**: TC-013-06  
**Priority**: Medium  
**Role**: Operator

#### Detailed Steps

**Step 1-7: Handle Alert**
1. Operator receives: "OVERDUE: Monthly Hydraulic Check"
2. Login as operator_test
3. Navigate to: My Alerts
4. See alert, click "Acknowledge"
5. System records acknowledgment
6. Execute overdue PM
7. Click "Mark as Resolved"
8. Add note: "PM completed, all tasks done"

**Expected**:
- Alert acknowledged
- Alert resolved after completion
- Logged in history

---

## 📦 WORKFLOW 14: Vendor Management

### Test Case 14.1: Admin Creates Vendor Master

**Test ID**: TC-014-01  
**Priority**: High  
**Role**: Admin

#### Test Data
```
Vendor Name: ABC Steel Suppliers
GSTIN: 29ABCDE1234F1Z5
Contact Person: Rajesh Sharma
Phone: +91-9876543210
Email: rajesh@abcsteel.com
Address: 789 Industrial Estate, Bangalore - 560100
Payment Terms: Net 30 days
Bank Details:
  Bank: ICICI Bank
  Account: 9876543210
  IFSC: ICIC0001234
  Branch: Whitefield, Bangalore
```

#### Detailed Steps

**Step 1-7: Add Vendor**
1. Login as admin_test
2. Navigate to: Vendor Master
3. Click "Add Vendor"
4. Fill all details
5. Upload vendor documents (GST cert, PAN)
6. Click "Save Vendor"

**Expected**:
- Vendor created
- Available for PO creation
- Documents stored

---

## 🔄 WORKFLOW 15: End-to-End Manufacturing Cycle Test

### Complete Workflow Integration Test

**Test ID**: TC-015-01  
**Priority**: Critical  
**Objective**: Test complete product lifecycle from raw material to delivery

#### Scenario
```
Product: Widget A (new product)
Raw Material: Steel Plate 5mm
Customer: XYZ Industries
Quantity: 50 units
```

#### Complete Flow (All Roles)

**PHASE 1: Setup (Admin)**
1. Create product master: Widget A
2. Create raw material: Steel Plate 5mm
3. Create checklist template: Quality Check - Widget A
4. Create invoice template
5. Create vendor: Steel supplier
6. Add spare parts inventory

**PHASE 2: Planning (Manager)**
7. Create purchase order for steel (1000 kg)
8. Receive steel into inventory
9. Assign quality checklist to operator
10. Schedule production: 50 units Widget A

**PHASE 3: Production (Operator)**
11. Complete startup checklist
12. Execute quality checklist
13. Issue raw materials (100 kg steel)
14. Record production: 50 units Widget A
15. Submit checklist for review

**PHASE 4: Quality (Reviewer)**
16. Review submitted checklist
17. Verify quality parameters
18. Approve checklist

**PHASE 5: Approval (Manager)**
19. Final checklist approval
20. Verify inventory: 50 units Widget A added
21. Verify raw material: 100 kg deducted

**PHASE 6: Sales (Manager)**
22. Create sales invoice: 50 units to XYZ Industries
23. Total: ₹2,50,000 (₹5,000/unit)
24. Invoice status: Draft (inventory still 50)

**PHASE 7: Dispatch (Manager + Operator)**
25. Generate gatepass from invoice
26. **Inventory deducted: 50 → 0 units**
27. Record vehicle exit (security gate)
28. Record proof of delivery (with signature)
29. Invoice status: Delivered

**PHASE 8: Payment (Manager)**
30. Customer pays: ₹1,50,000 (partial)
31. Record payment with FIFO allocation
32. Outstanding: ₹1,00,000
33. Send payment reminder for balance

**PHASE 9: Reporting (Admin/Manager)**
34. Generate GST report (includes this invoice)
35. View sales dashboard (revenue updated)
36. Export payment register
37. Print compliance reports

#### Expected Results
**Complete Lifecycle Verified**:
- ✅ Raw material: Purchased → Issued → Consumed
- ✅ Production: Planned → Executed → Quality checked
- ✅ Finished goods: Produced → Invoiced → Dispatched → Delivered
- ✅ Inventory: Tracked at every stage
- ✅ Quality: Checklist completed with approvals
- ✅ Sales: Invoice → Gatepass → POD → Payment
- ✅ Compliance: All reports generated
- ✅ Notifications: Sent at every critical step
- ✅ Audit trail: Complete history maintained

#### Validation Points
```sql
-- Verify final state:
SELECT * FROM raw_materials WHERE name = 'Steel Plate 5mm';
-- Remaining: 900 kg (1000 received - 100 issued)

SELECT * FROM finished_goods WHERE name = 'Widget A';
-- Quantity: 0 (50 produced - 50 dispatched)

SELECT * FROM invoices WHERE invoice_number = 'INV-2025-XXX';
-- Status: delivered, Amount: 250000, Paid: 150000, Due: 100000

SELECT * FROM gatepasses WHERE invoice_id = [invoice_id];
-- Status: delivered, Signature: [base64...]

SELECT * FROM checklists WHERE template_name LIKE '%Widget A%';
-- Status: completed, All approvals done
```

**Success Criteria**:
- ✅ Zero inventory discrepancies
- ✅ All workflows completed without errors
- ✅ All notifications sent
- ✅ Complete audit trail
- ✅ GST compliance maintained
- ✅ Payment tracking accurate

---

## 🎯 Testing Complete!

**Total Test Cases Documented: 55**
**All 15 Workflows Covered**
**All 4 Roles Tested**
**All 26 System Screens Included**

**Coverage**:
- ✅ Complete step-by-step instructions
- ✅ Exact test data provided
- ✅ UI element identifiers (data-testid)
- ✅ Expected results after each step
- ✅ Database validation queries
- ✅ Edge cases and error scenarios
- ✅ Post-condition verifications
- ✅ End-to-end integration test

**Ready for Comprehensive Testing!**

---

**End of Detailed Test Execution Guide**  
*All 55 test cases fully documented with step-by-step instructions*
