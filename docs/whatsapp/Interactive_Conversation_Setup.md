# WhatsApp Interactive Conversation Setup Guide

## Overview

The KINTO system now supports **interactive step-by-step checklist completion** via WhatsApp. Instead of receiving all tasks at once, operators answer questions one by one, can attach photos, and receive a confirmation summary before final submission.

## How It Works

### 1. Assignment Flow

```
Manager assigns checklist → Template message sent → Interactive conversation starts
```

### 2. Interactive Conversation

```
📱 Q1: Check hydraulic oil levels
👤 OK

📱 Q2: Test emergency stop button  
👤 NOK - Button stuck
📸 [Photo of button]

📱 Q3: Verify temperature gauge
👤 OK

✅ Summary shown with all answers
👤 CONFIRM

✅ Saved to database
```

### 3. Key Features

- **One question at a time**: Operators focus on each task individually
- **Photo uploads**: Attach photos for any question (especially NOK cases)
- **Flexible answers**: Simply reply "OK" or "NOK - description"
- **Final confirmation**: Review all answers before submitting
- **Auto-save**: Progress saved after each answer
- **Session expiry**: 24-hour window to complete (can resume later)
- **Reminders**: Get notified if you haven't answered

## WhatsApp Webhook Configuration

### Step 1: Get Your Webhook URL

Your webhook URL depends on your deployment:

**Replit Deployment:**
```
https://your-replit-app-name.repl.co/api/whatsapp/webhook
```

**Mac/Ubuntu Production (with Nginx):**
```
https://your-domain.com/api/whatsapp/webhook
```

### Step 2: Configure in Meta Business Suite

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Select your WhatsApp Business App
3. Navigate to **WhatsApp > Configuration**
4. Click **Edit** next to Webhook
5. Enter your webhook URL: `https://your-domain/api/whatsapp/webhook`
6. Enter verify token: `KINTO_WHATSAPP_VERIFY_TOKEN_2025`
   - Or use the value from your `WHATSAPP_VERIFY_TOKEN` environment variable
7. Click **Verify and Save**

### Step 3: Subscribe to Webhook Fields

Subscribe to these webhook fields:
- ✅ **messages** (incoming messages from operators)
- ✅ **message_status** (delivered, read, failed status)
- ✅ **message_template_status_update** (template approval status)

### Step 4: Verify Webhook is Working

After configuration, Meta will send a GET request to verify your webhook:

```
GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
```

Your webhook should respond with the challenge value. Check your server logs for:
```
[WHATSAPP WEBHOOK] Verification successful
```

## Environment Variables

Make sure these are configured (already set up if you've sent WhatsApp messages):

```env
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_VERIFY_TOKEN=KINTO_WHATSAPP_VERIFY_TOKEN_2025
```

## Database Migration

### For Mac Production Database

Run this SQL script:

```sql
-- File: updated_dbscripts/whatsapp_conversation_sessions.sql

CREATE TABLE IF NOT EXISTS whatsapp_conversation_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  submission_id VARCHAR REFERENCES checklist_submissions(id),
  template_id VARCHAR REFERENCES checklist_templates(id),
  machine_id VARCHAR REFERENCES machines(id),
  operator_id VARCHAR REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active',
  current_task_index INTEGER DEFAULT 0,
  total_tasks INTEGER NOT NULL,
  answers JSONB DEFAULT '[]',
  last_message_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_whatsapp_sessions_phone ON whatsapp_conversation_sessions(phone_number);
CREATE INDEX idx_whatsapp_sessions_status ON whatsapp_conversation_sessions(status);
CREATE INDEX idx_whatsapp_sessions_expires ON whatsapp_conversation_sessions(expires_at);
```

### For Replit Database

Already applied automatically! ✅

## Operator Instructions

### How to Answer Questions

**For OK (task completed successfully):**
```
OK
```

**For NOK (issue found):**
```
NOK - describe the problem
```

Examples:
```
NOK - Oil level below minimum
NOK - Button doesn't respond
NOK - Temperature at 35°C (above limit)
```

### How to Send Photos

1. Answer the question first (OK or NOK)
2. Send a photo directly via WhatsApp
3. The photo will be attached to the last question

### Final Confirmation

After all questions answered, you'll see a summary:

```
✅ All Questions Answered!

📋 Your Answers:

1. ✅ Check hydraulic oil levels
   Result: OK

2. ❌ Test emergency stop button
   Result: NOK
   Remarks: Button stuck
   📸 Photo attached

3. ✅ Verify temperature gauge
   Result: OK

━━━━━━━━━━━━━━━━━━

Reply with:
✅ CONFIRM - to submit
❌ CANCEL - to discard
```

Type **CONFIRM** to submit or **CANCEL** to discard.

## Testing the Interactive Flow

### Test Scenario

1. **Create a checklist** with 3 tasks in the admin panel
2. **Assign to an operator** with WhatsApp enabled
3. **Operator receives**:
   - Template notification: "New checklist assigned"
   - First question immediately
4. **Operator answers**:
   - Types "OK" or "NOK - remarks"
   - Optionally sends photo
5. **System responds** with next question
6. **After all questions**:
   - Summary shown
   - Operator types "CONFIRM"
7. **System saves** to database
8. **Manager/Reviewer** sees completed submission

## Troubleshooting

### Webhook Not Receiving Messages

1. **Check webhook URL** is publicly accessible
2. **Verify SSL certificate** (Meta requires HTTPS)
3. **Check firewall** allows incoming connections
4. **Review Meta webhook logs** in Business Suite
5. **Check server logs** for incoming requests

### Messages Not Processing

1. **Check server logs** for errors
2. **Verify phone number format** (must be E.164: +919876543210)
3. **Ensure template message** was sent first (opens 24h window)
4. **Check session expiry** (conversations expire after 24 hours)

### Session Issues

1. **Session expired**: Operator must wait for new assignment
2. **Multiple sessions**: Latest session takes priority
3. **Lost progress**: Answers saved after each question, can resume

## API Endpoints

### Webhook Verification (GET)
```
GET /api/whatsapp/webhook
Query params:
  - hub.mode=subscribe
  - hub.verify_token=YOUR_TOKEN
  - hub.challenge=CHALLENGE_VALUE
```

### Receive Messages (POST)
```
POST /api/whatsapp/webhook
Body: WhatsApp webhook payload from Meta
```

## Session Management

### Session States

- **active**: Currently asking questions
- **awaiting_confirmation**: All questions answered, waiting for CONFIRM
- **completed**: Successfully submitted to database
- **expired**: 24-hour window expired

### Session Expiry

- Conversations expire **24 hours** after template message
- Expired sessions show message: "This checklist session has expired"
- Operator must contact supervisor for new assignment

### Session Cleanup

Run this periodically to clean up expired sessions:

```sql
DELETE FROM whatsapp_conversation_sessions 
WHERE status = 'expired' 
  AND completed_at < NOW() - INTERVAL '7 days';
```

## Security Considerations

1. **Verify webhook requests** come from Meta (verify signature)
2. **Use environment variables** for sensitive tokens
3. **Validate phone numbers** before processing
4. **Rate limit** incoming messages
5. **Store photos securely** (currently base64 in database, consider S3 for production)

## Production Deployment Checklist

- [x] Webhook endpoint deployed
- [x] SSL certificate configured (HTTPS required)
- [x] Environment variables set
- [ ] Webhook URL configured in Meta Business Suite
- [ ] Webhook fields subscribed
- [ ] Webhook verified successfully
- [x] Database migration applied
- [ ] Test checklist assignment sent
- [ ] Operator receives and completes interactive conversation
- [ ] Manager sees completed submission

## Support

For issues or questions:
1. Check server logs: `/tmp/logs/workflow_logs/`
2. Check WhatsApp webhook logs in Meta Business Suite
3. Verify database has `whatsapp_conversation_sessions` table
4. Test webhook manually using curl or Postman

## Benefits Over Previous Approach

### Before (All Tasks at Once)
```
📱 Checklist assigned:
   1. Check oil
   2. Test button  
   3. Verify gauge

Reply: CL-ABC123 1:OK 2:NOK-stuck 3:OK
```

**Problems:**
- Complex format to remember
- All-or-nothing submission
- No photos
- Easy to make mistakes
- Can't review before submitting

### After (Interactive Conversation)
```
📱 Q1: Check oil
👤 OK

📱 Q2: Test button
👤 NOK - stuck
📸 [photo]

📱 Q3: Verify gauge
👤 OK

✅ Review summary
👤 CONFIRM
```

**Benefits:**
- ✅ Simple answers (OK/NOK)
- ✅ One task at a time
- ✅ Photo uploads
- ✅ Progress auto-saved
- ✅ Final review before submit
- ✅ Can resume later

## Next Steps

1. Configure webhook URL in Meta Business Suite
2. Run database migration on Mac production
3. Test with real operator
4. Train operators on new interactive flow
5. Monitor webhook logs for issues
