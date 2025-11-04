# KINTO Manufacturing QA Management System - User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [Admin Role](#admin-role)
3. [Operator Role](#operator-role)
4. [Reviewer Role](#reviewer-role)
5. [Manager Role](#manager-role)
6. [Common Features](#common-features)

---

## Getting Started

### Accessing the Application

1. Navigate to your application URL in a web browser (works on desktop and mobile)
2. Click **"Log in with Replit"** on the landing page
3. After authentication, you'll see the **Role Selector** screen
4. Choose your role: Admin, Operator, Reviewer, or Manager

**Landing Page:**

![Landing Page](attached_assets/generated_images/KINTO_QA_system_landing_page_6af60112.png)

**Role Selector:**

![Role Selector](attached_assets/generated_images/Role_selection_interface_627a87e2.png)

---

## Admin Role

The Admin role has access to all system features including configuration, user management, and reporting.

### Dashboard Overview

After selecting "Admin" role, you'll see 8 main tabs:
- **Dashboard** - Overview statistics
- **Machines** - Machine configuration
- **Checklists** - Quality checklist templates
- **Maintenance** - PM scheduling
- **PM Templates** - Reusable PM task lists
- **PM History** - Completed PM records
- **Spare Parts** - Inventory management
- **Purchase Orders** - PO generation

**Admin Dashboard:**

![Admin Dashboard](attached_assets/generated_images/Admin_dashboard_overview_d3871574.png)

---

### Use Case 1: Setting Up a New Machine

**Objective:** Add a new machine to the system for quality tracking

**Steps:**

1. Click the **"Machines"** tab
2. Click **"Add Machine Type"** button (top right)
3. Fill in the form:
   - **Name:** Enter machine type (e.g., "PET Blowing Machine")
   - **Description:** Brief description of the machine
4. Click **"Add Machine Type"**
5. The new machine type appears in the list
6. Click **"Add Machine"** to add a specific machine instance
7. Fill in:
   - **Machine ID:** Unique identifier (e.g., "PET-001")
   - **Machine Type:** Select from dropdown
   - **Location:** Physical location (e.g., "Production Floor A")
   - **Installation Date:** When installed
8. Click **"Add Machine"**

**Expected Result:** Machine appears in the machines list and is now available for checklist assignment.

---

### Use Case 2: Creating a Quality Checklist Template

**Objective:** Build a reusable checklist for daily machine inspections

**Steps:**

1. Click the **"Checklists"** tab
2. Click **"Create New Checklist"** button
3. Fill in checklist details:
   - **Name:** "Daily Machine Inspection"
   - **Machine Type:** Select the target machine type
   - **Shift:** Select shift (Morning/Afternoon/Night)
4. Click **"Add Task"** to add inspection items
5. For each task, enter:
   - **Task Name:** What to check (e.g., "Check Oil Level")
   - **Verification Criteria:** How to verify (e.g., "Oil should be between MIN and MAX marks")
   - **Pass/Fail:** Toggle on
   - **Photo Required:** Toggle if photo evidence needed
6. Add 4-8 tasks for comprehensive inspection
7. Click **"Save Checklist"**

**Expected Result:** Checklist template is saved and available for operators to use.

---

### Use Case 3: Creating PM Task List Templates

**Objective:** Build reusable preventive maintenance task lists that can be linked to scheduled maintenance

**Steps:**

1. Click the **"PM Templates"** tab
2. Click **"Create New Template"** button
3. Fill in template details:
   - **Template Name:** "Monthly Compressor Service"
   - **Machine Type:** Select machine type (e.g., "Air Compressor")
   - **Description:** Brief description of the maintenance
4. Click **"Add Task"** to add maintenance tasks
5. For each task, enter:
   - **Task Name:** What to do (e.g., "Replace Air Filter")
   - **Description:** Detailed instructions
   - **Verification Criteria:** How to verify completion
   - **Requires Photo:** Toggle if photo evidence needed
6. Add all necessary tasks (typically 5-15 tasks)
7. Click **"Create Template"**

**Expected Result:** PM template is saved and can be linked when scheduling maintenance.

**Best Practice:** Create templates for recurring maintenance (monthly, quarterly, annual) to ensure consistency.

---

### Use Case 4: Scheduling Preventive Maintenance

**Objective:** Schedule a maintenance task with optional PM template

**Steps:**

1. Click the **"Maintenance"** tab
2. Click **"Schedule PM"** button (top right)
3. Fill in the schedule form:
   - **Plan Name:** Descriptive name (e.g., "Quarterly Deep Clean - RFC Machine")
   - **Machine:** Select target machine from dropdown
   - **Frequency:** Select frequency (Daily/Weekly/Monthly/Quarterly/Annually)
   - **Next Due Date:** When maintenance is due
   - **Assigned To:** Operator or team name
   - **Task List Template:** (Optional) Select a PM template to link
4. Click **"Schedule PM"**

**Expected Result:** 
- Scheduled maintenance appears in the maintenance list
- If template was linked, tasks will auto-load when operator completes the PM
- Status shows as "Upcoming" (green badge)

**Note:** Linking a template ensures operators follow standardized procedures.

---

### Use Case 5: Managing Spare Parts Inventory

**Objective:** Add spare parts and set reorder thresholds

**Steps:**

1. Click the **"Spare Parts"** tab
2. Click **"Add Part"** button
3. Fill in part details:
   - **Part Number:** SKU/Part ID (e.g., "FILTER-AF-001")
   - **Part Name:** Descriptive name (e.g., "Air Compressor Filter")
   - **Machine Type:** Link to machine type
   - **Category:** Select category (Electrical/Mechanical/Pneumatic/Hydraulic/Electronic/Other)
   - **Current Stock:** Quantity on hand
   - **Minimum Stock:** Reorder threshold
   - **Unit Cost:** Price per unit
   - **Supplier:** Vendor name
   - **Urgency Level:** Critical/High/Medium/Low
4. Click **"Add Part"**

**Expected Result:** 
- Part appears in inventory list
- If current stock < minimum stock, shows "Low Stock" warning (red badge)
- Low stock items automatically appear in Purchase Order generation

---

### Use Case 6: Generating Purchase Orders

**Objective:** Create PO for low-stock items

**Steps:**

1. Click the **"Purchase Orders"** tab
2. Review **"Low Stock Parts"** section (automatically populated)
3. Click **"Generate PO"** button
4. System creates a draft PO with:
   - All low-stock parts included
   - Calculated order quantities
   - Total estimated cost
5. Review PO details:
   - PO number (auto-generated)
   - Grouped by supplier
   - Line items with quantities and costs
6. Click **"Export PDF"** to download
7. Optionally click **"Mark as Submitted"** after sending to supplier

**Expected Result:** PDF purchase order ready to send to suppliers, tracking of pending orders.

---

### Use Case 7: Reviewing PM Execution History

**Objective:** Audit completed preventive maintenance records

**Steps:**

1. Click the **"PM History"** tab
2. Browse completed PM executions (most recent first)
3. Each card shows:
   - Machine name
   - Template used (if any)
   - Completion date
   - Executor name
   - Pass/Fail summary
4. Click **"View Details"** on any execution
5. Review detailed task results:
   - Each task's pass/fail status
   - Notes entered by operator
   - Photos uploaded (if required)
   - Timestamp of completion
6. Click **"Close"** to return to list

**Expected Result:** Complete audit trail of all maintenance activities with photo evidence.

**PM History View:**

![PM History View](attached_assets/generated_images/PM_history_view_cd8eda31.png)

**Use for:** 
- Compliance audits
- Identifying recurring issues
- Performance tracking
- Training documentation

---

## Operator Role

Operators perform daily quality checks, complete checklists, and execute preventive maintenance.

### Dashboard Overview

Operator dashboard shows 3 main views:
- **Dashboard** - Quick stats and assigned machines
- **Checklist** - Active quality inspection form
- **History** - Previously completed checklists

---

### Use Case 1: Completing a Daily Quality Checklist

**Objective:** Perform and document daily machine inspection

**Steps:**

1. From Operator Dashboard, click on an assigned machine card (e.g., "RFC Machine")
2. Or navigate to **"Checklist"** view
3. The active checklist loads with all tasks
4. For each task:
   - Read the task name and verification criteria
   - Perform the inspection
   - Select **Pass** or **Fail** radio button
   - If photo required, tap **"Choose File"** or use camera icon
   - Take photo of the verification point
   - Add optional notes in the remarks field
5. Complete all tasks in the checklist
6. Add optional **"General Notes"** at bottom (shift notes, observations)
7. Click **"Submit Checklist"**
8. Confirmation toast appears: "Checklist submitted successfully"

**Expected Result:** 
- Checklist saved to database
- Available in History view
- Sent to Reviewer for approval (if reviewer role enabled)
- Statistics updated on dashboard

**Checklist Form (Mobile View):**

![Mobile Checklist Form](attached_assets/generated_images/Mobile_checklist_form_ca71bc67.png)

**Best Practice:** 
- Take clear, well-lit photos
- Note any abnormalities even if task passes
- Submit at end of shift

---

### Use Case 2: Completing a Preventive Maintenance Task

**Objective:** Execute scheduled PM with task list template

**Steps:**

1. From Operator Dashboard, scroll to **"Scheduled Maintenance"** section
2. Find the upcoming or overdue PM task
3. Click **"Complete PM"** button (green button on right)
4. PM Execution Dialog opens showing:
   - Maintenance plan name
   - Machine name
   - Template tasks (if linked) or "No template" message
5. If template is linked, work through each task:
   - Read task name, description, and verification criteria
   - Perform the maintenance step
   - Select **Pass** or **Fail** status
   - Upload photo if required (tap camera icon or choose file)
   - Add notes about the task
6. Add **"General Notes"** for overall execution comments
7. Click **"Complete PM"** button
8. Confirmation appears and dialog closes

**Expected Result:**
- PM execution saved to database
- Appears in PM History tab with all task details
- Maintenance plan status updated
- Admin can review with photo evidence

**PM Execution Dialog:**

![PM Execution Dialog](attached_assets/generated_images/PM_execution_dialog_ecf06071.png)

**Important Notes:**
- All tasks must be completed (pass or fail) before submission
- Photos are stored as base64 for offline capability
- Can add notes even for passed tasks

---

### Use Case 3: Viewing Personal Checklist History

**Objective:** Review previously submitted checklists

**Steps:**

1. Navigate to **"History"** view in bottom navigation
2. View list of all submitted checklists showing:
   - Machine name
   - Date submitted
   - Shift
   - Your name (as operator)
   - Approval status (approved/in_review)
3. Click on any record to view details (if detail view implemented)

**Expected Result:** Personal audit trail of all completed work.

---

## Reviewer Role

Reviewers approve or reject checklist submissions from operators.

### Dashboard Overview

Reviewer dashboard focuses on quality assurance with:
- **Pending Reviews** - Checklists awaiting approval
- **Approved Today** - Recently approved items
- **Rejected Items** - Items needing rework
- Detailed review interface

---

### Use Case 1: Reviewing and Approving a Checklist

**Objective:** Validate operator's quality inspection work

**Steps:**

1. From Reviewer Dashboard, view **"Pending Reviews"** section
2. Each pending item shows:
   - Machine name
   - Operator name
   - Date/shift submitted
   - Number of tasks
3. Click **"Review"** button on a checklist
4. Review each task result:
   - Task name and criteria
   - Pass/Fail result from operator
   - Photos submitted (if any)
   - Operator's remarks
5. Assess quality of documentation:
   - Are photos clear?
   - Are failures properly documented?
   - Are notes adequate?
6. Decision:
   - Click **"Approve"** if satisfactory (green button)
   - Click **"Reject"** if inadequate (red button)
7. If rejecting, add rejection reason in notes
8. Confirmation toast appears

**Expected Result:**
- Status updated to "approved" or "rejected"
- Moves to appropriate category
- Operator can see feedback if rejected

**Review Criteria:**
- Photo quality and relevance
- Proper documentation of failures
- Completeness of remarks
- Adherence to verification criteria

---

### Use Case 2: Monitoring Quality Trends

**Objective:** Identify recurring issues across machines

**Steps:**

1. Review approved checklists over past week
2. Look for patterns:
   - Same task failing repeatedly
   - Same machine having issues
   - Quality degradation trends
3. Escalate to Manager if systemic issues found
4. Recommend additional training if operator errors recurring

**Expected Result:** Proactive quality improvement, not just reactive approval.

---

## Manager Role

Managers have read-only access to all data for oversight and reporting.

### Dashboard Overview

Manager dashboard provides high-level metrics:
- **Total Machines** - Fleet size
- **Active Checklists** - Templates in use
- **Completion Rate** - Performance metric
- **Pending Items** - Work queue visibility
- Access to all historical data

---

### Use Case 1: Monitoring Overall Performance

**Objective:** Track team and facility performance

**Steps:**

1. Review dashboard statistics:
   - Completion rate (should be >95%)
   - Pending items (should be low)
   - Active checklists (coverage metric)
2. Click through tabs to see:
   - Machine status and maintenance schedules
   - Checklist completion history
   - Spare parts inventory levels
   - Purchase order status
   - PM execution history
3. Identify trends:
   - Machines with frequent issues
   - Operators needing support
   - Inventory running low
   - Overdue maintenance

**Expected Result:** Data-driven decisions for operational improvements.

---

### Use Case 2: Generating Reports for Management

**Objective:** Prepare monthly quality report

**Process:**

1. Click **"PM History"** tab
2. Review all completed PM executions for the month
3. Note metrics:
   - Number of PMs completed
   - Pass/fail rates per machine
   - Average completion time
   - Issues identified
4. Click **"Spare Parts"** tab
5. Review inventory metrics:
   - Stock levels
   - Parts consumed
   - Purchase orders issued
6. Compile data into management report showing:
   - Quality compliance rate
   - Maintenance completion rate
   - Inventory health
   - Action items for next month

**Expected Result:** Comprehensive quality and maintenance report for leadership.

---

### Use Case 3: Audit Trail Review

**Objective:** Investigate a quality incident

**Steps:**

1. Identify machine and date of incident
2. Navigate to **"History"** view (or equivalent in Manager dashboard)
3. Filter/search for:
   - Specific machine
   - Date range
   - Operator
4. Review all checklists for that period:
   - Were inspections performed?
   - Were any failures noted?
   - Were photos adequate?
5. Check **"PM History"**:
   - Was maintenance up to date?
   - Were any issues noted in PM tasks?
6. Review **"Spare Parts"**:
   - Were parts available?
   - Were replacements done?

**Expected Result:** Complete timeline of quality and maintenance activities leading to incident.

---

## Common Features

### Photo Upload (Mobile-Optimized)

**Mobile Camera Access:**
1. When photo required, tap file input
2. Mobile devices show option: "Take Photo" or "Choose from Gallery"
3. Select "Take Photo" to open camera
4. Capture clear, well-lit image
5. Photo preview appears immediately
6. Can retake if needed

**Best Practices:**
- Ensure good lighting
- Focus on relevant detail
- Include context (wider shot if helpful)
- Photos stored as base64 (works offline)

---

### Offline Capability

**How it Works:**
- Form data saved locally as you work
- Can complete checklists without internet
- Data syncs when connection restored
- Photos stored in base64 format

**Best Practice:**
- Complete form fully before closing app
- Verify submission succeeded (look for toast)
- Don't close browser until "Success" message

---

### Mobile Navigation

**Bottom Navigation Bar:**
- Dashboard icon - Main overview
- Checklist icon - Active tasks
- History icon - Past records
- Settings icon - User settings (top right)

**Responsive Design:**
- Works on iOS and Android browsers
- Touch-optimized buttons (minimum 44px height)
- Swipe-friendly cards
- Easy one-handed operation

---

## Troubleshooting

### Issue: "Complete PM" button not appearing

**Cause:** Maintenance plan is already marked complete or inactive
**Solution:** Admin needs to create a new maintenance schedule with status "active"

---

### Issue: Cannot submit checklist

**Cause 1:** Required photos not uploaded
**Solution:** Check all tasks marked "Photo Required" have images

**Cause 2:** Not all tasks completed
**Solution:** Ensure every task has Pass or Fail selected

---

### Issue: PM template tasks not loading

**Cause:** No template linked to maintenance plan
**Solution:** Admin should:
1. Create PM template in "PM Templates" tab
2. When scheduling maintenance, select template from dropdown
3. New executions will load template tasks

---

### Issue: Photos not uploading

**Cause:** File too large or format unsupported
**Solution:** 
- Keep photos under 5MB
- Use JPEG/PNG format
- Reduce image quality in camera settings if needed

---

## Best Practices Summary

### For Admins:
- Create templates before scheduling (checklists and PM tasks)
- Set realistic minimum stock levels
- Review PM history monthly for trends
- Keep machine records up to date

### For Operators:
- Submit checklists at end of each shift
- Take clear photos with good lighting
- Document failures thoroughly in notes
- Complete PMs on schedule, not after due date

### For Reviewers:
- Review within 24 hours of submission
- Provide constructive feedback on rejections
- Look for quality trends, not just individual issues
- Escalate systemic problems to Manager

### For Managers:
- Monitor completion rates weekly
- Review PM history for maintenance trends
- Check inventory levels monthly
- Use data to drive process improvements

---

## Appendix: Data Flow Diagrams

### Checklist Flow:
```
Admin creates template → Operator completes checklist → 
Reviewer approves/rejects → Manager monitors trends
```

### PM Flow:
```
Admin creates PM template → Admin schedules maintenance → 
Operator completes PM (with template tasks) → 
Execution saved to history → Manager reviews compliance
```

### Spare Parts Flow:
```
Admin adds parts with min/max levels → Stock depletes → 
Low stock warning triggers → Admin generates PO → 
Parts restocked → Cycle repeats
```

---

## Support

For technical issues or feature requests, contact your system administrator or the development team.

**System Version:** 1.0.0  
**Last Updated:** November 2025  
**Platform:** Web-based (iOS/Android compatible)

---

*End of User Manual*
