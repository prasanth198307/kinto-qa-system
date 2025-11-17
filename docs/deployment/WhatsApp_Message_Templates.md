# WhatsApp Message Templates for KINTO Smart Ops

## Overview

WhatsApp Business API requires **approved message templates** to send notifications outside the 24-hour messaging window. This document contains all templates needed for KINTO operations.

---

## Template Submission Process

### How to Submit Templates to Meta:

1. **Go to Meta Business Suite**: https://business.facebook.com/wa/manage/message-templates/
2. **Click "Create Template"**
3. **Enter the template details** (provided below)
4. **Submit for approval**
5. **Wait 1-2 business days** for Meta review
6. **Use approved templates** in KINTO system

---

## Required Message Templates

### Template 1: Machine Startup Reminder

**Template Name:** `machine_startup_reminder`  
**Category:** `UTILITY`  
**Language:** `English`

**Template Body:**
```
Hello {{1}},

This is a reminder to start the machine before production begins:

Machine: {{2}}
Scheduled Start Time: {{3}}

Please ensure the machine is properly warmed up and ready for production.

Reply with your status.

- KINTO Operations Team
```

**Parameters:**
1. `{{1}}` - Operator Name (e.g., "Rajesh")
2. `{{2}}` - Machine Name (e.g., "Injection Molding Machine 1")
3. `{{3}}` - Scheduled Time (e.g., "08:00 AM, 15 Nov 2025")

**Header:** None  
**Footer:** None  
**Buttons:** None (or add Quick Reply buttons: "Started" / "Delayed")

---

### Template 2: Missed Checklist Alert

**Template Name:** `missed_checklist_alert`  
**Category:** `UTILITY`  
**Language:** `English`

**Template Body:**
```
KINTO Missed Checklist Alert

Operator {{1}} has not completed the following checklist:

Machine: {{2}}
Checklist: {{3}}
Due Time: {{4}}

Please take immediate action.

- KINTO QA System
```

**Parameters:**
1. `{{1}}` - Operator Name
2. `{{2}}` - Machine Name
3. `{{3}}` - Checklist Name
4. `{{4}}` - Due DateTime

**Header:** None  
**Footer:** None  
**Buttons:** None

---

### Template 3: QA Checklist Assignment

**Template Name:** `qa_checklist_assigned`  
**Category:** `UTILITY`  
**Language:** `English`

**Template Body:**
```
Hello {{1}},

New QA Checklist Assigned:

Task ID: {{2}}
Machine: {{3}}
Checklist: {{4}}
Due: {{5}}

Please complete this checklist on time.

Reply with your status or questions.

- KINTO QA Team
```

**Parameters:**
1. `{{1}}` - Operator Name
2. `{{2}}` - Task Reference ID
3. `{{3}}` - Machine Name
4. `{{4}}` - Checklist Name
5. `{{5}}` - Due DateTime

---

### Template 4: Production Alert

**Template Name:** `production_alert`  
**Category:** `UTILITY`  
**Language:** `English`

**Template Body:**
```
Production Alert

{{1}}

Product: {{2}}
Shift: {{3}}
Action Required: {{4}}

Contact supervisor if you need assistance.

- KINTO Operations
```

**Parameters:**
1. `{{1}}` - Alert Type (e.g., "Material Shortage")
2. `{{2}}` - Product Name
3. `{{3}}` - Shift (A/B/General)
4. `{{4}}` - Required Action

---

## Template Submission Instructions

### Step-by-Step Guide:

#### Step 1: Access Message Templates
1. Go to: https://business.facebook.com/wa/manage/message-templates/
2. Select your WhatsApp Business Account
3. Click **"Create Template"**

#### Step 2: Fill Template Details

**For "Machine Startup Reminder" template:**

| Field | Value |
|-------|-------|
| **Template name** | `machine_startup_reminder` |
| **Category** | Select **"UTILITY"** |
| **Languages** | Select **"English"** |
| **Header** | Leave empty (or select "None") |
| **Body** | Copy the body text above |
| **Footer** | Leave empty |
| **Buttons** | Optional: Add "Quick Reply" buttons |

**Parameter Samples (for approval):**
- {{1}}: "Rajesh Kumar"
- {{2}}: "Injection Molding Machine 1"
- {{3}}: "08:00 AM, November 15, 2025"

#### Step 3: Submit for Review

1. Click **"Submit"**
2. Wait for Meta to review (1-2 business days)
3. Check approval status in Message Templates page

#### Step 4: Repeat for All Templates

Submit all 4 templates above following the same process.

---

## After Templates are Approved

Once your templates are approved by Meta, update the KINTO system to use them.

### Configuration in KINTO:

**File:** `server/whatsappService.ts`

Update the service to send template messages instead of free-form text:

```typescript
async sendMachineStartupReminder(
  phoneNumber: string,
  machineName: string,
  scheduledTime: string,
  taskReferenceId: string
): Promise<boolean> {
  const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: {
      name: 'machine_startup_reminder',
      language: {
        code: 'en'
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: operatorName },
            { type: 'text', text: machineName },
            { type: 'text', text: scheduledTime }
          ]
        }
      ]
    }
  };
  
  // ... send request
}
```

---

## Template Language Support

### Telugu Templates (తెలుగు)

If you want to send messages in Telugu, create additional templates:

**Template Name:** `machine_startup_reminder_te`  
**Category:** `UTILITY`  
**Language:** `Telugu (తెలుగు)`

**Template Body:**
```
నమస్కారం {{1}},

ఉత్పత్తి ప్రారంభానికి ముందు యంత్రాన్ని ప్రారంభించడానికి గుర్తు చేయు సందేశం:

యంత్రం: {{2}}
షెడ్యూల్ సమయం: {{3}}

దయచేసి యంత్రం సరిగ్గా వేడెక్కి ఉత్పత్తికి సిద్ధంగా ఉందని నిర్ధారించండి.

మీ స్థితిని ప్రత్యుత్తరం ఇవ్వండి.

- KINTO ఆపరేషన్స్ టీమ్
```

### Hindi Templates (हिंदी)

**Template Name:** `machine_startup_reminder_hi`  
**Category:** `UTILITY`  
**Language:** `Hindi (हिंदी)`

**Template Body:**
```
नमस्ते {{1}},

उत्पादन शुरू होने से पहले मशीन शुरू करने के लिए अनुस्मारक:

मशीन: {{2}}
निर्धारित समय: {{3}}

कृपया सुनिश्चित करें कि मशीन ठीक से गर्म हो गई है और उत्पादन के लिए तैयार है।

अपनी स्थिति के साथ जवाब दें।

- KINTO संचालन टीम
```

---

## Template Status Codes

After submission, templates can have these statuses:

| Status | Meaning |
|--------|---------|
| **PENDING** | Awaiting Meta review |
| **APPROVED** | Ready to use |
| **REJECTED** | Not approved (check rejection reason) |
| **PAUSED** | Temporarily disabled |
| **DISABLED** | Permanently disabled |

---

## Common Rejection Reasons

Templates may be rejected if:

1. ❌ Too promotional (e.g., "Buy now!", "Limited offer!")
2. ❌ Contains prohibited content (gambling, adult content)
3. ❌ Poor formatting or unclear purpose
4. ❌ Missing required parameters
5. ❌ Violates WhatsApp policies

**Tips for Approval:**
- ✅ Keep it professional and informational
- ✅ Clearly state purpose (notification, alert, reminder)
- ✅ Use proper grammar and formatting
- ✅ Provide realistic sample values

---

## Next Steps

1. **Submit all 4 templates** to Meta for approval
2. **Wait 1-2 days** for approval
3. **Update KINTO code** to use approved templates
4. **Test with real employee numbers**

Once approved, you can send unlimited messages to any WhatsApp number without the 24-hour window restriction!

---

**Document Version:** 1.0  
**Last Updated:** November 17, 2025  
**Status:** Ready for Submission
