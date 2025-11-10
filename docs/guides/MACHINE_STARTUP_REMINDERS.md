# Machine Startup Reminder System - User Guide

## Overview

The Machine Startup Reminder System is an automated notification solution that ensures machines are started on time before production begins. It uses two-way WhatsApp communication (via Meta Business Cloud API) and email notifications to remind operators and track their responses in real-time.

**Key Features:**
- Automated reminders sent before scheduled machine startup time
- Two-way WhatsApp communication with task reference tracking
- Email notifications with professional formatting
- Real-time response tracking (on-time, late, early)
- Security features: sender verification and race condition protection
- Dynamic configuration via admin UI or environment variables
- WhatsApp Analytics dashboard for monitoring response rates

---

## Quick Start

### For Managers/Admins (Creating Tasks)

1. Navigate to **Production Operations** → **Machine Startup Reminders**
2. Click **Create Startup Task**
3. Fill in the form:
   - **Operator:** Select who should start the machine
   - **Machine:** Choose which machine to start
   - **Production Date:** Select the date
   - **Scheduled Start Time:** When the machine should be started (e.g., 8:00 AM)
   - **Shift:** Morning/Evening/Night
   - **Reminder Before:** How many minutes before to send notification (e.g., 30)
   - **Enable WhatsApp:** ✅ Check to send WhatsApp reminder
   - **Enable Email:** ✅ Check to send email reminder
   - **Notes:** Optional additional information
4. Click **Save**

### For Operators (Responding to Reminders)

#### Option 1: WhatsApp Reply (Recommended)
You'll receive a WhatsApp message like:
```
MACHINE STARTUP REMINDER

Machine: CNC Machine 5
Scheduled: 10 Nov 2025, 8:00 AM

Reply "Done MST-A1B2C3" when started
Task ID: MST-A1B2C3

- KINTO QA System
```

**To confirm machine started:**
Simply reply with: `Done MST-A1B2C3` (copy the task ID from the message)

**You'll receive confirmation:**
```
Confirmed! Machine CNC Machine 5 marked as started.
Status: On Time
Time: 5 min before scheduled
```

#### Option 2: Manual UI Confirmation
1. Open the application
2. Go to **Machine Startup Reminders**
3. Find your task and click **Mark Complete**

---

## Complete Workflow

### 1. Task Creation (Manager/Admin)

**Who Can Create:** Admin, Manager  
**Initial Status:** `pending`

**Required Information:**
- Assigned operator
- Machine to start
- Production date and scheduled time
- Reminder lead time (minutes before)
- Notification channels (WhatsApp/Email)

### 2. Automatic Reminder Sending (System)

**Trigger Condition:**  
Current Time = (Scheduled Start Time - Reminder Minutes)

**Example:**
- Scheduled Start: 8:00 AM
- Reminder Before: 30 minutes
- Reminder Sent At: 7:30 AM

**System Actions:**
1. Generates unique Task Reference ID (format: `MST-XXXXXX`)
2. Loads notification configuration from database (or environment variables)
3. Sets WhatsApp credentials dynamically
4. Sends notifications via enabled channels
5. Updates task status to `notified`
6. Records notification timestamps

**WhatsApp Message Format:**
```
MACHINE STARTUP REMINDER

Machine: [Machine Name]
Scheduled: [Date and Time]

Reply "Done [Task Reference]" when started
Task ID: [Task Reference]

- KINTO QA System
```

**Email Format:**
Professional HTML email with:
- Company branding
- Machine name and scheduled time
- Clear instructions for operator
- Contact information

### 3. Operator Response Processing

#### WhatsApp Reply Processing (Two-Way Communication)

**Webhook Endpoint:** `POST /api/whatsapp/webhook`

**Security Checks:**
1. ✅ Webhook verification using `WHATSAPP_VERIFY_TOKEN`
2. ✅ Message type validation (text messages only)
3. ✅ Task reference ID parsing from message
4. ✅ Sender phone number verification (must match assigned operator)
5. ✅ Task status verification (prevents overwriting completed/cancelled tasks)

**Response Status Calculation:**

| Response Time | Status | Description |
|--------------|--------|-------------|
| Within ±15 min of scheduled time | `on_time` | Perfect timing |
| More than 15 min before | `early` | Started too early |
| More than 15 min after | `late` | Started late |

**Task Update (Atomic):**
```sql
UPDATE machine_startup_tasks
SET status = 'completed',
    operator_response = [WhatsApp message],
    operator_response_time = [Current timestamp],
    response_status = [on_time/late/early],
    machine_started_at = [Current timestamp]
WHERE id = [task_id]
  AND status NOT IN ('completed', 'cancelled')
```

**Confirmation Message Sent Back:**
```
Confirmed! Machine [Name] marked as started.
Status: [On Time/Late/Early]
Time: [X] min [before/after] scheduled
```

#### Manual UI Completion

**Endpoint:** `PATCH /api/machine-startup-tasks/:id`

**Operator Action:**
- Click "Mark Complete" button
- System updates status to `completed`
- Records `machineStartedAt` timestamp

### 4. Task States

```
┌─────────┐  Reminder      ┌──────────┐  Response     ┌───────────┐
│ PENDING ├───────────────>│ NOTIFIED ├──────────────>│ COMPLETED │
└─────────┘  (automated)    └──────────┘  (operator)   └───────────┘
     │                           │
     │ Manager cancels           │ Manager cancels
     ├──────────────────────────┐│
     ▼                           ▼▼
┌───────────┐
│ CANCELLED │
└───────────┘
```

**Status Definitions:**
- **Pending:** Task created, waiting for reminder time
- **Notified:** Reminder sent, waiting for operator response
- **Completed:** Machine started, task finished
- **Cancelled:** Task cancelled by manager/admin

---

## Configuration

### Admin Configuration (Recommended)

Navigate to **Admin** → **Notification Settings**

#### WhatsApp Settings (Meta Business Cloud API)

1. **Enable WhatsApp Notifications:** Toggle ON
2. **Meta Phone Number ID:** Your Meta WhatsApp Phone Number ID
   - Get from: Meta Business Manager → WhatsApp → API Setup
3. **Meta Access Token:** Permanent access token
   - Generate from: Meta Business App → WhatsApp Product
4. **Webhook Verify Token:** Secure random string (create your own)
   - Example: `kinto_secure_webhook_token_2025`
5. **Test Mode:** 
   - ON = Console logging only (for testing)
   - OFF = Real WhatsApp sending (production)

#### Email Settings (SendGrid)

1. **Enable Email Notifications:** Toggle ON
2. **Sender Email:** Verified sender email in SendGrid
3. **Sender Name:** Display name (e.g., "KINTO QA System")

**Important:** Database settings take precedence over environment variables!

### Environment Variables (Alternative)

If not using database configuration, set these on your server:

```bash
# WhatsApp (Meta Business Cloud API)
WHATSAPP_PHONE_NUMBER_ID="123456789012345"
WHATSAPP_ACCESS_TOKEN="EAAxxxxxxxxxxxxxxxxx"
WHATSAPP_VERIFY_TOKEN="your_secure_random_token"

# Email (SendGrid)
SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxx"
```

### Meta WhatsApp Setup Guide

1. **Create Meta Business Account**
   - Go to business.facebook.com
   - Create new business account

2. **Create Business App**
   - Go to developers.facebook.com
   - Create new app → Business type
   - Add WhatsApp product

3. **Get Phone Number ID**
   - WhatsApp → API Setup
   - Copy Phone Number ID

4. **Generate Access Token**
   - App Settings → Basic
   - Generate permanent access token
   - Copy and save securely

5. **Configure Webhook**
   - WhatsApp → Configuration → Webhook
   - Callback URL: `https://your-domain.com/api/whatsapp/webhook`
   - Verify Token: Same as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to: `messages` events

6. **Test Connection**
   - Send test message from Meta dashboard
   - Verify webhook receives messages

---

## API Reference

### Create Machine Startup Task

```http
POST /api/machine-startup-tasks
Authorization: Required (admin, manager)
Content-Type: application/json

{
  "assignedUserId": "user-uuid",
  "machineId": "machine-uuid",
  "productionDate": "2025-11-10",
  "scheduledStartTime": "2025-11-10T08:00:00Z",
  "shift": "Morning",
  "reminderBeforeMinutes": 30,
  "whatsappEnabled": 1,
  "emailEnabled": 1,
  "notes": "Important production run"
}
```

**Response:**
```json
{
  "id": "task-uuid",
  "assignedUserId": "user-uuid",
  "machineId": "machine-uuid",
  "productionDate": "2025-11-10",
  "scheduledStartTime": "2025-11-10T08:00:00.000Z",
  "shift": "Morning",
  "reminderBeforeMinutes": 30,
  "whatsappEnabled": 1,
  "emailEnabled": 1,
  "status": "pending",
  "taskReferenceId": null,
  "createdAt": "2025-11-09T10:30:00.000Z"
}
```

### Get Machine Startup Tasks

```http
GET /api/machine-startup-tasks
Authorization: Required

Query Parameters:
  - date: Filter by production date (YYYY-MM-DD)
  - userId: Filter by assigned user
  - status: Filter by status (pending, notified, completed, cancelled)
```

**Response:**
```json
[
  {
    "id": "task-uuid",
    "assignedUserId": "user-uuid",
    "machineId": "machine-uuid",
    "machineName": "CNC Machine 5",
    "operatorName": "John Doe",
    "productionDate": "2025-11-10",
    "scheduledStartTime": "2025-11-10T08:00:00.000Z",
    "status": "completed",
    "taskReferenceId": "MST-A1B2C3",
    "operatorResponse": "Done MST-A1B2C3",
    "operatorResponseTime": "2025-11-10T07:58:00.000Z",
    "responseStatus": "on_time",
    "machineStartedAt": "2025-11-10T07:58:00.000Z",
    "whatsappSent": 1,
    "emailSent": 1
  }
]
```

### Update Task (Mark Complete)

```http
PATCH /api/machine-startup-tasks/:id
Authorization: Required
Content-Type: application/json

{
  "status": "completed",
  "machineStartedAt": "2025-11-10T07:58:00Z"
}
```

**Operator Restrictions:**
- Can only update their own tasks
- Can only update `status` and `machineStartedAt` fields

**Manager/Admin:**
- Can update any task
- Can update any field

### WhatsApp Webhook (Incoming Messages)

```http
POST /api/whatsapp/webhook
Content-Type: application/json

{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "919876543210",
          "text": {
            "body": "Done MST-A1B2C3"
          },
          "id": "wamid.xxx"
        }]
      }
    }]
  }]
}
```

**Processing:**
1. Parse task reference from message
2. Find task by reference ID
3. Verify sender phone matches assigned operator
4. Calculate response status (on_time/late/early)
5. Update task atomically
6. Send confirmation message back

---

## WhatsApp Analytics

Navigate to **Production Operations** → **WhatsApp Analytics**

### Metrics Displayed

**Response Rate Card:**
- Total tasks sent
- Total responses received
- Response rate percentage
- Color-coded: Green (>80%), Yellow (50-80%), Red (<50%)

**Response Breakdown Card:**
- On-time responses (count + percentage)
- Late responses (count + percentage)
- Early responses (count + percentage)
- No response (count + percentage)

**Response History Table:**
Columns:
- Task Reference ID
- Machine Name
- Operator Name
- Scheduled Time
- Response Time
- Status (on_time/late/early/no_response)
- Time Difference (minutes)

**Filters:**
- Date range picker
- Status filter (all/on_time/late/early/no_response)

---

## Security Features

### 1. Webhook Verification

**Protection:** Prevents unauthorized webhook calls

**Implementation:**
- Meta sends `hub.verify_token` during webhook setup
- Server validates against `WHATSAPP_VERIFY_TOKEN`
- Returns 403 if verification fails
- Returns 500 if `WHATSAPP_VERIFY_TOKEN` not configured

### 2. Sender Verification

**Protection:** Only assigned operator can complete their task

**Implementation:**
```javascript
// Normalize phone numbers (remove non-digits)
const normalizedFrom = incomingPhone.replace(/\D/g, '');
const normalizedAssigned = operatorPhone.replace(/\D/g, '');

// Compare last 10 digits (handles various formats)
const fromLast10 = normalizedFrom.slice(-10);
const assignedLast10 = normalizedAssigned.slice(-10);

if (fromLast10 !== assignedLast10) {
  // Reject unauthorized sender
  return "Task is not assigned to this number";
}
```

### 3. Race Condition Protection

**Protection:** Prevents overwriting completed/cancelled tasks

**Implementation:**
```sql
UPDATE machine_startup_tasks
SET status = 'completed', ...
WHERE id = [task_id]
  AND status NOT IN ('completed', 'cancelled')
RETURNING *;
```

If update returns no rows → task was already completed by another process

### 4. Message Type Guards

**Protection:** Handles non-text messages safely

**Implementation:**
```javascript
if (!message.text || !message.text.body) {
  console.log('Non-text message received, ignoring');
  return; // Skip buttons, images, audio, etc.
}
```

---

## Troubleshooting

### Reminders Not Sending

**Check:**
1. ✅ Task status is `pending`
2. ✅ Current time has reached reminder time
3. ✅ WhatsApp/Email enabled for task
4. ✅ Notification config enabled in database or env vars
5. ✅ Test mode is OFF for production sending
6. ✅ Server logs for errors

**View Logs:**
- Test Mode ON: Check console for notification logs
- Production: Check server logs for API errors

### WhatsApp Replies Not Working

**Check:**
1. ✅ Webhook configured correctly in Meta dashboard
2. ✅ `WHATSAPP_VERIFY_TOKEN` set and matches Meta config
3. ✅ Webhook URL is publicly accessible
4. ✅ Operator replied with correct task reference ID
5. ✅ Operator's phone number matches assigned user
6. ✅ Task status is `notified` (not already completed)

**Test Webhook:**
```bash
# Check webhook verification
curl "https://your-domain.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"
# Should return: test
```

### Wrong Response Status

**Issue:** Task marked as late but operator was on time

**Causes:**
1. Server timezone not set correctly
2. Scheduled time entered in wrong timezone
3. System time drift

**Solution:**
- All times stored in UTC in database
- Display times converted to 'Asia/Kolkata' timezone
- Check server timezone: `date`

### Phone Number Format Issues

**Common Problems:**
- Leading zeros: `09876543210`
- Country code variations: `+919876543210` vs `919876543210`
- Spaces/dashes: `+91 98765 43210`

**System Handling:**
1. Removes all non-digits
2. Removes leading zero if present
3. Adds country code (91) if missing
4. Compares last 10 digits for matching

**Recommendation:**
Store phone numbers as 10-digit format: `9876543210`

---

## Best Practices

### For Managers/Admins

1. **Set Appropriate Reminder Times**
   - Consider machine warm-up time
   - Account for operator commute/shift start
   - Typically: 30-60 minutes before scheduled start

2. **Enable Both Channels**
   - WhatsApp for quick response
   - Email as backup/documentation

3. **Monitor Analytics**
   - Check response rates weekly
   - Address patterns of late responses
   - Follow up on no-response cases

4. **Test Before Production**
   - Use Test Mode to verify message format
   - Send test reminders to yourself
   - Verify WhatsApp reply flow works

### For Operators

1. **Reply Promptly**
   - Respond as soon as machine is started
   - Maintains accurate timing records
   - Helps with production planning

2. **Copy Task Reference Exactly**
   - Include "Done" + task reference
   - Example: `Done MST-A1B2C3`
   - Case insensitive, but ID must match

3. **Check Multiple Channels**
   - WhatsApp preferred for speed
   - Email as backup if WhatsApp fails
   - UI always available as fallback

---

## Cost Considerations

### WhatsApp (Meta Business Cloud API)

**Service Conversations (FREE):**
- User-initiated conversations: FREE for 72 hours
- Operator WhatsApp replies count as user-initiated
- System confirmation messages within 72h window: FREE

**Business-Initiated Conversations:**
- First 1,000 conversations/month: FREE
- After 1,000: Varies by country (India: ~$0.004 per conversation)

**Comparison:**
- **Meta API:** FREE for most startup reminders (service conversations)
- **Twilio:** $0.005-$0.0085 per message
- **Savings:** 2.4x cheaper + free service conversations

### Email (SendGrid)

**Free Tier:**
- 100 emails/day: FREE
- Sufficient for most small-to-medium operations

**Paid Plans:**
- Start at $19.95/month for 50,000 emails

---

## Support

### Getting Help

1. **Check Logs:**
   - Test Mode: Console shows all notification activity
   - Production: Server logs show errors and confirmations

2. **WhatsApp Analytics:**
   - View response history
   - Identify patterns in failures
   - Export data for analysis

3. **System Administrators:**
   - Contact your system admin for configuration issues
   - Provide task reference ID and timestamp
   - Include error messages from logs

### Common Questions

**Q: Can I send reminders to multiple operators?**  
A: No, each task is assigned to one operator. Create separate tasks for multiple operators.

**Q: What if operator doesn't have WhatsApp?**  
A: Enable email notifications as primary channel, or provide UI access for manual completion.

**Q: Can I edit a task after creation?**  
A: Managers/admins can edit pending tasks. Once notified, only status can be changed.

**Q: How do I know if reminder was sent?**  
A: Task status changes to `notified` and timestamps are recorded. Check task details or logs.

**Q: What happens if operator replies after scheduled time?**  
A: Task still completes, but marked as `late` with time difference recorded.

---

## Appendix

### Task Reference ID Format

**Pattern:** `MST-XXXXXX`
- `MST` = Machine Startup Task
- `XXXXXX` = 6 random alphanumeric characters (uppercase)

**Example:** `MST-A1B2C3`, `MST-XY9Z4K`

**Uniqueness:** Guaranteed unique across all tasks

### Database Schema

**Table:** `machine_startup_tasks`

**Key Columns:**
```sql
id                      VARCHAR (UUID)
assigned_user_id        VARCHAR (FK to users)
machine_id              VARCHAR (FK to machines)
production_date         DATE
scheduled_start_time    TIMESTAMP
reminder_before_minutes INTEGER
whatsapp_enabled        INTEGER (0/1)
email_enabled           INTEGER (0/1)
status                  VARCHAR (pending/notified/completed/cancelled)
task_reference_id       VARCHAR (unique)
operator_response       TEXT
operator_response_time  TIMESTAMP
response_status         VARCHAR (on_time/late/early/no_response)
machine_started_at      TIMESTAMP
notification_sent_at    TIMESTAMP
whatsapp_sent           INTEGER (0/1)
email_sent              INTEGER (0/1)
```

### Notification Configuration Schema

**Table:** `notification_config`

**Columns:**
```sql
id                    VARCHAR (UUID)
email_enabled         INTEGER (0/1)
sender_email          VARCHAR
sender_name           VARCHAR
whatsapp_enabled      INTEGER (0/1)
meta_phone_number_id  VARCHAR
meta_access_token     TEXT
meta_verify_token     VARCHAR
test_mode             INTEGER (0/1)
```

---

**Document Version:** 1.0  
**Last Updated:** November 10, 2025  
**System Version:** Production Ready
