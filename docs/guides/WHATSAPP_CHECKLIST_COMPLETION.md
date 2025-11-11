# WhatsApp Checklist Completion Guide

## Overview

The KINTO Operations & QA system supports **WhatsApp-based checklist completion with incremental task-by-task submission**, allowing operators to complete assigned checklists directly via WhatsApp messages instead of using the mobile app. Operators can submit tasks individually, in batches, or all at once - the system tracks progress and auto-submits when complete.

**Status:** ✅ Production Ready (November 10, 2025)

## Key Features

1. **Incremental Task Submission:**
   - Submit tasks one at a time: `CL-ABC123 1:OK`
   - Submit in batches: `CL-ABC123 1:OK 2:NOK-remarks`
   - Submit all at once: `CL-ABC123 1:OK 2:OK 3:OK`
   - System tracks progress after each submission

2. **Progress Tracking:**
   - Confirmation after each task: "Task 2/5 completed. 3 remaining."
   - Auto-submission when all tasks completed
   - Explicit completion: Send "DONE" (uppercase) to submit anytime

3. **Flexible Input:**
   - Mixed-case status accepted: Ok, nok, NA
   - Lowercase "done" in remarks preserved (won't trigger submission)
   - Uppercase "DONE" command triggers submission

4. **Security & Validation:**
   - Phone number verification (only assigned operator)
   - Prevents duplicate submissions (idempotency)
   - Transaction-safe submission creation

## Workflow Summary

```
Manager Assigns Checklist (with WhatsApp enabled)
           ↓
System Sends Checklist via WhatsApp to Operator
           ↓
Operator Submits Task 1 (e.g., "CL-ABC123 1:OK")
           ↓
System Stores Answer & Confirms ("Task 1/5 completed. 4 remaining.")
           ↓
Operator Submits Task 2 (e.g., "CL-ABC123 2:NOK-broken")
           ↓
System Stores Answer & Confirms ("Task 2/5 completed. 3 remaining.")
           ↓
... continues until all tasks completed ...
           ↓
System Auto-Submits OR Operator Sends "DONE"
           ↓
System Creates Submission & Notifies Reviewer
           ↓
Reviewer Approves/Rejects Submission
```

## Key Features

1. **Two-Way Communication:**
   - System sends checklist tasks to operator via WhatsApp
   - Operator responds with completion status and remarks
   - System automatically creates submission and notifies reviewer

2. **Structured Message Format:**
   - Simple, human-readable format: `CL-ABC123 1:OK 2:NOK-remarks 3:OK`
   - Supports OK (pass), NOK (fail), and NA (not applicable) statuses
   - Captures full remarks including numbers and special characters

3. **Security & Validation:**
   - Phone number verification (only assigned operator can complete)
   - All-or-nothing validation (all tasks must be completed)
   - Idempotency (prevents duplicate submissions)
   - Transaction-safe submission creation

4. **Automatic Notifications:**
   - Confirmation sent to operator after submission
   - Reviewer notified when submission created
   - Clear status messages for success/error cases

## Message Format

### Outbound Message (System → Operator)

```
Checklist Assignment for Machine CNC-01

Tasks to complete:
1. Check coolant level
2. Inspect tool wear
3. Clean work area

To complete, reply with:
CL-A1B2C3 1:OK 2:OK 3:OK

Use: OK (pass), NOK (fail), NA (not applicable)
Add remarks after NOK: 2:NOK-broken parts
```

**Format:**
- **Task Reference:** `CL-XXXXXX` (6 alphanumeric characters)
- **Tasks:** Numbered list of tasks to complete
- **Response Example:** Shows how to format the completion message

### Inbound Message (Operator → System)

**Incremental Submission (One Task at a Time):**
```
CL-A1B2C3 1:OK
# System: "Task 1/5 completed. 4 remaining."

CL-A1B2C3 2:NOK-broken parts
# System: "Task 2/5 completed. 3 remaining."

CL-A1B2C3 3:OK
# System: "Task 3/5 completed. 2 remaining."
```

**Batch Submission (Multiple Tasks):**
```
CL-A1B2C3 1:OK 2:NOK-Temp 45C issue 3:OK
# System: "Tasks 1, 2, 3 completed. 2/5 done. 3 remaining."
```

**Complete All at Once:**
```
CL-A1B2C3 1:OK 2:OK 3:OK 4:OK 5:OK
# System: "All 5 tasks completed. Checklist submitted for review!"
```

**Explicit Completion with DONE Command:**
```
CL-A1B2C3 4:OK 5:NA DONE
# System: "All 5 tasks completed. Checklist submitted for review!"
```

**Format Rules:**
- **Task Reference:** Must match exactly (e.g., `CL-A1B2C3`)
- **Task Results:** `TaskNumber:STATUS[-remarks]`
- **Status Values:** `OK`, `NOK`, or `NA` (mixed-case accepted: Ok, nok, etc.)
- **Remarks:** Optional, added after `-` (can include numbers, spaces, lowercase "done")
- **DONE Command:** Uppercase "DONE" only (triggers submission)
- **Partial Submission:** Can submit any task(s) at any time
- **No Duplicates:** Can't re-submit same task number

**Valid Examples:**
```
# Single task
CL-ABC123 1:OK

# Multiple tasks with mixed case
CL-ABC123 1:Ok 2:nok-already done 3:NA

# With courtesy text (ignored)
CL-ABC123 1:OK thanks

# Explicit completion
CL-ABC123 1:OK 2:OK DONE
```

**Invalid Examples:**
```
CL-ABC123 1:PASS              # Invalid status (use OK/NOK/NA)
ABC123 1:OK                   # Missing CL- prefix
CL-ABC123 1:OK done           # Lowercase "done" won't submit
CL-ABC123 1:OK 1:NOK          # Can't submit same task twice
```

## Database Schema

### ChecklistAssignments Table

WhatsApp-related fields:

```typescript
whatsappEnabled: integer("whatsapp_enabled").default(0)
taskReferenceId: varchar("task_reference_id")
whatsappNotificationSent: integer("whatsapp_notification_sent").default(0)
whatsappNotificationSentAt: timestamp("whatsapp_notification_sent_at")
operatorResponse: text("operator_response")
operatorResponseTime: timestamp("operator_response_time")
```

**Field Descriptions:**
- `whatsappEnabled`: 0 = disabled, 1 = enabled (set by manager)
- `taskReferenceId`: Unique reference like `CL-ABC123` for tracking
- `whatsappNotificationSent`: 0 = not sent, 1 = sent
- `whatsappNotificationSentAt`: Timestamp when WhatsApp message sent
- `operatorResponse`: Full message text from operator (last message)
- `operatorResponseTime`: Timestamp when operator last replied

### PartialTaskAnswers Table (NEW)

Stores incremental task submissions before final checklist submission.

```typescript
id: varchar("id").primaryKey().default(sql`gen_random_uuid()`)
assignment_id: varchar("assignment_id").references(() => checklistAssignments.id)
task_order: integer("task_order")
task_name: varchar("task_name")
status: varchar("status") // OK, NOK, or NA
remarks: text("remarks")
answered_at: timestamp("answered_at").defaultNow()
answered_by: varchar("answered_by") // Operator phone number
created_at: timestamp("created_at").defaultNow()
UNIQUE(assignment_id, task_order) // Prevents duplicate task submissions
```

**Purpose:** Tracks progress as operator submits tasks one-by-one.

**Lifecycle:**
1. Operator sends "CL-ABC123 1:OK" → Row created
2. Operator sends "CL-ABC123 2:NOK-remarks" → Another row created
3. When all tasks complete → Submission created, partial answers deleted

## Backend Implementation

### 1. Notification Service (`server/notificationService.ts`)

**Function: `sendChecklistViaWhatsApp()`**

Sends checklist tasks to operator via WhatsApp.

```typescript
async sendChecklistViaWhatsApp(
  assignment: ChecklistAssignment,
  operator: User,
  template: ChecklistTemplate,
  machine: Machine,
  tasks: TemplateTask[]
): Promise<boolean>
```

**Features:**
- Generates unique task reference ID (`CL-XXXXXX` format)
- Formats tasks in numbered list
- Provides response example
- Supports test mode (console log instead of sending)
- Updates assignment with reference ID and notification status

**Example Output:**
```
Checklist Assignment for Machine CNC-01

Tasks to complete:
1. Check coolant level
2. Inspect tool wear
3. Clean work area

To complete, reply with:
CL-A1B2C3 1:OK 2:OK 3:OK

Use: OK (pass), NOK (fail), NA (not applicable)
Add remarks after NOK: 2:NOK-broken parts
```

### 2. Storage Methods (`server/storage.ts`)

**New Methods:**

```typescript
// Find assignment by task reference ID
async getChecklistAssignmentByReference(
  taskReferenceId: string
): Promise<ChecklistAssignment | undefined>

// Transactionally create submission with tasks
async createChecklistSubmissionWithTasks(
  submissionData: {...},
  tasks: Array<{taskName, result, remarks}>
): Promise<{ submission, tasks }>
```

**Transaction Safety:**
- Creates `checklistSubmissions` record
- Bulk inserts `submissionTasks` records
- Both operations succeed or both fail (atomic)

### 3. WhatsApp Webhook (`server/routes.ts`)

**Endpoint: `POST /api/whatsapp/webhook`**

**Processing Steps:**

1. **Extract Message:**
   - Parse incoming WhatsApp message
   - Acknowledge receipt immediately (required by Meta)

2. **Find Checklist Reference:**
   - Match pattern: `/CL-[A-Z0-9]{6}/i`
   - Lookup assignment by reference ID

3. **Verify Sender:**
   - Compare last 10 digits of phone numbers
   - Reject if not assigned operator

4. **Check Assignment Status:**
   - Verify status is `pending`
   - Prevent duplicate submissions (idempotency)

5. **Parse Task Results:**
   - Regex: `/(\d+):(OK|NOK|NA)(?:-(.+?))?(?=\s+\d+:|$)/gi`
   - Captures task number, status, and full remarks
   - Handles digits in remarks (e.g., "Temp 45C")

6. **Validate Tasks:**
   - Load template tasks
   - Verify ALL tasks have results
   - Validate status values (OK/NOK/NA only)

7. **Create Submission:**
   - Transactionally create submission + tasks
   - Update assignment with submission link
   - Set status to `completed`

8. **Send Confirmation:**
   - Reply to operator with success message
   - Include machine name and task count
   - Show "Pending review" status

**Security Measures:**
- Phone verification (last 10 digits)
- Assignment ownership check
- Status validation (prevents overwrites)
- Transaction safety (all-or-nothing)

**Regex Pattern Explanation:**

```typescript
/(\d+):([A-Za-z]+)(?:-((?:(?!\s+\d+:|\s+DONE\b).)+))?/g
```

**Pattern Breakdown:**
- `(\d+)`: Capture task number (1, 2, 3, ...)
- `:([A-Za-z]+)`: Capture status letters (any case: OK, Ok, nok, etc.)
- `(?:-((?:(?!\s+\d+:|\s+DONE\b).)+))?`: Optional remarks using tempered greedy token
  - `-`: Dash separator
  - `(?:(?!\s+\d+:|\s+DONE\b).)+`: Capture everything EXCEPT next task or DONE
  - No `i` flag → Makes "DONE" matching case-sensitive
- Status normalized with `.toUpperCase()` and validated

**Tempered Greedy Token:**
- Prevents remark from consuming next task (`\s+\d+:`)
- Prevents remark from consuming DONE command (`\s+DONE\b`)
- Allows lowercase "done" inside remarks (e.g., "already done")
- Uppercase "DONE" as standalone command triggers submission

**Why this pattern:**
- Captures full remarks: "NOK-Temp 45C already done" → "Temp 45C already done"
- Stops at next task: "1:OK-broken 2:OK" → Remark is "broken", not "broken 2:OK"
- Case-sensitive DONE: "done" in remarks preserved, "DONE" command triggers submission

## Frontend Integration (To Be Implemented)

### Checklist Assignment Form

**Location:** `client/src/pages/ChecklistAssignment.tsx` (or similar)

**New Field: WhatsApp Toggle**

```tsx
<div className="flex items-center space-x-2">
  <Switch
    id="whatsappEnabled"
    checked={form.watch('whatsappEnabled') === 1}
    onCheckedChange={(checked) => 
      form.setValue('whatsappEnabled', checked ? 1 : 0)
    }
  />
  <Label htmlFor="whatsappEnabled">
    Send via WhatsApp
  </Label>
</div>
```

**Behavior:**
- When enabled: System sends checklist via WhatsApp
- When disabled: Standard assignment (operator uses mobile app)
- Shows operator's mobile number for verification

## Error Handling

### Common Error Scenarios

| Error | Cause | Response |
|-------|-------|----------|
| Checklist not found | Invalid or expired reference ID | "Checklist CL-ABC123 not found" |
| Already completed | Operator sends completion twice | "Checklist already marked as completed" |
| Unauthorized sender | Phone number doesn't match | "Checklist not assigned to this number" |
| Missing tasks | Not all tasks completed | "Please complete ALL tasks. Missing: 2, 4" |
| Invalid status | Used PASS instead of OK | "Invalid status for task 2. Use: OK, NOK, or NA" |
| No template tasks | Template has no tasks defined | "Checklist has no tasks defined" |

### Error Messages (Operator-Friendly)

All error messages are clear and actionable:

```
✅ Good: "Please complete ALL tasks. Missing: 2, 4"
❌ Bad: "Validation error: incomplete task array"

✅ Good: "Invalid status for task 2. Use: OK, NOK, or NA"
❌ Bad: "RegEx match failed on line 2"
```

## Testing

### Manual Test Scenarios

**Test 1: Basic Completion**
```
Manager: Assign checklist with WhatsApp enabled
Expected: Operator receives WhatsApp message with CL-XXXXXX
Operator: Reply "CL-XXXXXX 1:OK 2:OK 3:OK"
Expected: Submission created, confirmation sent
```

**Test 2: Completion with Remarks**
```
Operator: Reply "CL-ABC123 1:OK 2:NOK-Temp 45C broken parts 3:OK"
Expected: Remarks "Temp 45C broken parts" stored correctly
```

**Test 3: Missing Tasks**
```
Operator: Reply "CL-ABC123 1:OK 2:OK" (missing task 3)
Expected: Error "Please complete ALL tasks. Missing: 3"
```

**Test 4: Invalid Status**
```
Operator: Reply "CL-ABC123 1:PASS 2:OK 3:OK"
Expected: Error "Invalid status for task 1. Use: OK, NOK, or NA"
```

**Test 5: Unauthorized Sender**
```
Different operator: Reply with valid reference
Expected: Error "Checklist not assigned to this number"
```

**Test 6: Duplicate Submission**
```
Operator: Submit same checklist twice
Expected: Second attempt returns "already marked as completed"
```

### Automated Testing (To Be Implemented)

Create E2E tests covering:
- Basic completion workflow
- Remarks with digits and special characters
- Missing tasks validation
- Invalid status validation
- Phone verification
- Idempotency

## Configuration

### Environment Variables

Same as Machine Startup Reminders:

```bash
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_VERIFY_TOKEN=your_verify_token
```

### Test Mode

Enable test mode in Notification Settings:

```typescript
// In notification configuration
meta: {
  testMode: true  // Logs to console instead of sending
}
```

## Monitoring & Logging

### Console Logs

**Successful Processing:**
```
Found checklist reference: CL-ABC123
✅ Checklist CL-ABC123 completed via WhatsApp, submission 12345 created
```

**Error Processing:**
```
Checklist CL-ABC123: Missing tasks 2, 4
Checklist CL-ABC123: Unauthorized sender +919876543210
Checklist CL-ABC123 submission error: <error details>
```

### Analytics (To Be Implemented)

Track metrics:
- WhatsApp completion rate vs mobile app
- Average response time
- Error rates by type
- Operator adoption rate

## Best Practices

### For Managers

1. **Enable WhatsApp selectively:**
   - Use for field operators without easy mobile app access
   - Use when quick turnaround needed
   - Verify operator has correct mobile number

2. **Keep checklists concise:**
   - WhatsApp works best with 3-7 tasks
   - Too many tasks increase error rate

3. **Train operators:**
   - Show example messages
   - Emphasize ALL tasks must be completed
   - Explain OK/NOK/NA meanings

### For Operators

1. **Copy reference exactly:**
   - Include `CL-` prefix
   - Match capitalization

2. **Complete all tasks:**
   - System rejects partial completions
   - Check message for task count

3. **Add clear remarks:**
   - Be specific: "NOK-Temp 45C exceeds limit"
   - Not vague: "NOK-broken"

4. **Check confirmation:**
   - Wait for confirmation message
   - Contact manager if no confirmation

## Comparison: WhatsApp vs Mobile App

| Feature | WhatsApp | Mobile App |
|---------|----------|------------|
| Internet Required | Yes (WhatsApp) | Yes (API calls) |
| User Interface | Text-based | Visual forms |
| Ease of Use | Simple messages | Guided UI |
| Offline Support | No | Possible with caching |
| Response Time | Fast | Moderate |
| Error Prevention | Text validation | Form validation |
| Best For | Quick completions | Complex checklists |

## Troubleshooting

### Issue: Operator not receiving messages

**Possible Causes:**
- Operator mobile number not set in user profile
- WhatsApp Business API not configured
- Phone number format incorrect

**Solutions:**
1. Verify operator has mobile number in profile
2. Check WHATSAPP_* environment variables
3. Test with notification settings test mode
4. Verify phone number format (+91XXXXXXXXXX)

### Issue: "Checklist not found" error

**Possible Causes:**
- Operator typed reference incorrectly
- Assignment was deleted
- Reference ID expired

**Solutions:**
1. Ask operator to copy reference exactly from WhatsApp message
2. Verify assignment still exists in system
3. Check assignment is in `pending` status

### Issue: Remarks getting truncated

**Fixed:** Regex pattern now correctly captures full remarks including digits.

**Test:** Send "CL-ABC123 1:OK 2:NOK-Temp 45C broken parts 3:OK"
**Expected:** Remarks stored as "Temp 45C broken parts" (not "Temp")

## Future Enhancements

1. **Partial Submissions:**
   - Allow operators to submit partial completions
   - Track which tasks are pending
   - Send reminders for incomplete tasks

2. **Rich Media Support:**
   - Accept photos for NOK tasks
   - Voice notes for detailed remarks
   - Location data for field checklists

3. **Multi-language Support:**
   - Accept OK/NOK in local languages
   - Translated confirmation messages
   - Language detection

4. **Analytics Dashboard:**
   - WhatsApp vs mobile app completion rates
   - Average response times
   - Error patterns
   - Operator performance

5. **Automated Follow-ups:**
   - Remind operator if no response within X hours
   - Escalate to manager if overdue
   - Auto-assign to backup operator

## Related Documentation

- [Machine Startup Reminders](MACHINE_STARTUP_REMINDERS.md) - Similar WhatsApp workflow
- [Checklist System Overview](CHECKLIST_SYSTEM.md) - Overall checklist architecture
- [Reviewer Dashboard Guide](REVIEWER_DASHBOARD.md) - Approval workflow

## Change Log

**November 11, 2025 - Version 3.0 (Photo Capture & Spare Parts):**
- ✅ **MAJOR:** Photo capture for NOK tasks with WhatsApp media download
- ✅ **MAJOR:** Optional spare parts requests linked to inventory catalog
- ✅ Local photo storage in `attached_assets/checklist_photos/`
- ✅ Spare parts search by name with automatic catalog linkage
- ✅ Conversation state tracking (`waitingForPhoto`, `waitingForSparePart`)
- ✅ Phone verification for image uploads
- ✅ SKIP option for spare parts request
- ✅ Free-text fallback for non-catalog spare parts
- ✅ Storage methods: `updatePartialTaskPhoto`, `updatePartialTaskSparePart`, `searchSparePartsByName`
- ✅ Database fields: `photoUrl`, `sparePartId`, `sparePartRequestText` in partial_task_answers

**November 10, 2025 - Version 2.0 (Incremental Submission):**
- ✅ **MAJOR:** Incremental task-by-task submission workflow
- ✅ Added `partial_task_answers` table for progress tracking
- ✅ Progress notifications after each task submission
- ✅ Auto-submission when all tasks completed
- ✅ Explicit DONE command (uppercase only, case-sensitive)
- ✅ Mixed-case status support (Ok, nok, NA)
- ✅ Lowercase "done" preserved in remarks (won't trigger submission)
- ✅ Tempered greedy token regex for robust parsing
- ✅ Storage methods: upsertPartialTaskAnswer, getPartialTaskProgress
- ✅ Prevents duplicate task submissions (UNIQUE constraint)
- ✅ Cleanup partial answers after submission

**November 10, 2025 - Version 1.0 (All-or-Nothing):**
- ✅ Initial implementation (deprecated - use v2.0)
- ✅ Regex fix for digit-containing remarks
- ✅ Phone verification using mobileNumber field
- ✅ Transactional submission creation
- ✅ Comprehensive error handling

---

**Document Version:** 3.0  
**Last Updated:** November 11, 2025  
**Status:** Production Ready (Photo Capture & Spare Parts)
