# Moving Business Logic to Colloki Flow - Architecture Guide

**⚠️ WARNING: This approach has significant risks. Read carefully before implementing.**

---

## 🎯 Goal

Move conversation flow management from backend to Colloki Flow:
- Colloki Flow manages session state
- Colloki Flow decides next question
- Colloki Flow sends questions
- Backend only saves final results

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Operator Sends Reply via WhatsApp                         │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  Meta WhatsApp Webhook                                      │
│  URL: https://collokiflow.micapps.com/webhook/...          │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  Colloki Flow - Main Conversation Flow                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 1. Receive Message                                    │ │
│  │    - Phone number                                     │ │
│  │    - Message text                                     │ │
│  │    - Photo (if any)                                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                   ↓                                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 2. Get Session State (from Colloki Storage)          │ │
│  │    - Current question index                           │ │
│  │    - Answers so far                                   │ │
│  │    - Template tasks                                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                   ↓                                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 3. AI Interpret Response                              │ │
│  │    - OK/NOK classification                            │ │
│  │    - Extract remarks                                  │ │
│  └───────────────────────────────────────────────────────┘ │
│                   ↓                                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 4. Update Session State                               │ │
│  │    - Save answer                                      │ │
│  │    - Increment question index                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                   ↓                                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 5. Decision: More Questions?                          │ │
│  └───────────────┬───────────────────────────────────────┘ │
│                  │                                          │
│         ┌────────┴────────┐                                │
│         ↓                 ↓                                │
│    ┌────────┐      ┌──────────┐                           │
│    │  YES   │      │    NO    │                           │
│    └────┬───┘      └─────┬────┘                           │
│         │                 │                                │
│         ↓                 ↓                                │
│  ┌─────────────┐   ┌──────────────────┐                   │
│  │ Send Next   │   │ Send Confirmation│                   │
│  │ Question    │   │ Summary          │                   │
│  │ (WhatsApp)  │   │ (WhatsApp)       │                   │
│  └─────────────┘   └──────────────────┘                   │
│                            ↓                               │
│                   ┌──────────────────┐                     │
│                   │ Wait for CONFIRM │                     │
│                   │ or CANCEL        │                     │
│                   └────────┬─────────┘                     │
│                            ↓                               │
│                   ┌──────────────────┐                     │
│                   │ Call Backend API │                     │
│                   │ to Save Results  │                     │
│                   └────────┬─────────┘                     │
└────────────────────────────┼─────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│  Your Backend: POST /api/colloki/save-submission           │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Payload:                                              │ │
│  │ {                                                     │ │
│  │   "phoneNumber": "+919000151199",                    │ │
│  │   "assignmentId": "...",                             │ │
│  │   "answers": [                                       │ │
│  │     {                                                │ │
│  │       "taskName": "Check oil level",                │ │
│  │       "result": "OK",                               │ │
│  │       "remarks": null,                              │ │
│  │       "photoUrl": null                              │ │
│  │     },                                              │ │
│  │     ...                                             │ │
│  │   ]                                                 │ │
│  │ }                                                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                   ↓                                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Save to Database:                                     │ │
│  │ - Update submission status → 'completed'             │ │
│  │ - Insert submission_tasks                            │ │
│  │ - Update assignment status → 'completed'             │ │
│  │ - Update session → 'completed'                       │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 **Required Changes**

### 1. **Configure Meta WhatsApp Webhook**

Point Meta webhook to Colloki Flow instead of your backend:

**Before:**
```
Webhook URL: https://your-app.replit.app/api/whatsapp/webhook
```

**After:**
```
Webhook URL: https://collokiflow.micapps.com/webhook/COLLOKI_WEBHOOK_ID
```

(Colloki Flow will provide this URL when you create a webhook trigger)

---

### 2. **Colloki Flow - Session Storage**

Colloki Flow needs to store session data. Options:

**Option A: Colloki Flow's Built-in Storage**
- Stores data in Colloki's cloud
- Pros: Easy to use
- Cons: Data locked in Colloki, hard to debug, may have limits

**Option B: External Database (e.g., Supabase)**
- Colloki Flow calls external API to get/set session data
- Pros: You control the data
- Cons: Extra API calls, more complexity

**Recommended**: Use Colloki's built-in session storage (key-value store)

---

### 3. **Colloki Flow - Main Flow Components**

#### Component 1: Webhook Trigger
```
Input: WhatsApp message webhook from Meta
Outputs:
  - phoneNumber
  - messageText
  - imageUrl (optional)
```

#### Component 2: Get Session State
```
Input: phoneNumber (as session key)
Logic: Retrieve from Colloki storage
Outputs:
  - currentQuestionIndex
  - answersArray
  - templateTasks (array of all tasks)
  - assignmentId
  - submissionId
```

#### Component 3: AI Interpretation
```
Input: messageText
Logic: AI interprets as OK/NOK + remarks
Outputs:
  - result (OK/NOK)
  - remarks (string)
  - confidence (number)
```

#### Component 4: Update Session
```
Input:
  - currentQuestionIndex
  - answersArray
  - result
  - remarks
Logic:
  - answersArray[currentQuestionIndex] = {result, remarks}
  - currentQuestionIndex++
  - Save back to storage
```

#### Component 5: Decision - More Questions?
```
Input: currentQuestionIndex, templateTasks.length
Logic: IF currentQuestionIndex >= templateTasks.length THEN "Done" ELSE "Next Question"
```

#### Component 6A: Send Next Question
```
Input: templateTasks[currentQuestionIndex]
Logic: Format question message
Output: Send WhatsApp message
```

#### Component 6B: Send Confirmation Summary
```
Input: answersArray
Logic: Build summary of all answers
Output: Send WhatsApp message asking for CONFIRM/CANCEL
```

#### Component 7: Handle Confirmation
```
Input: messageText
Logic: IF "CONFIRM" THEN call backend API ELSE discard
```

#### Component 8: Call Backend API
```
HTTP POST Request to: https://your-app.replit.app/api/colloki/save-submission
Headers: 
  - Content-Type: application/json
  - Authorization: Bearer YOUR_API_KEY (for security)
Body:
{
  "phoneNumber": "...",
  "assignmentId": "...",
  "submissionId": "...",
  "answers": [...]
}
```

---

### 4. **Backend - New Endpoint**

Create new API endpoint to receive final results:

```typescript
// server/routes.ts

app.post('/api/colloki/save-submission', async (req, res) => {
  try {
    // Verify API key (security)
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    if (apiKey !== process.env.COLLOKI_CALLBACK_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { phoneNumber, assignmentId, submissionId, answers } = req.body;

    // Validate payload
    if (!phoneNumber || !submissionId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Save to database
    await db.transaction(async (tx) => {
      // Update submission status
      await tx
        .update(checklistSubmissions)
        .set({
          status: 'completed',
          submittedAt: new Date(),
        })
        .where(eq(checklistSubmissions.id, submissionId));

      // Save individual task results
      for (const answer of answers) {
        await tx.insert(submissionTasks).values({
          submissionId: submissionId,
          taskName: answer.taskName,
          result: answer.result,
          remarks: answer.remarks,
          photoUrl: answer.photoUrl,
        });
      }

      // Mark assignment as completed (if linked)
      if (assignmentId) {
        await tx
          .update(checklistAssignments)
          .set({
            status: 'completed',
            operatorResponseTime: new Date(),
          })
          .where(eq(checklistAssignments.id, assignmentId));
      }
    });

    console.log(`[COLLOKI CALLBACK] Saved submission ${submissionId}`);

    res.json({ success: true });
  } catch (error) {
    console.error('[COLLOKI CALLBACK] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

### 5. **Backend - Start Conversation (Modified)**

When starting a conversation, send initial data to Colloki Flow:

```typescript
// server/routes.ts (existing endpoint modified)

app.post('/api/whatsapp/test-start-conversation', async (req, res) => {
  const { phoneNumber, templateId, machineId, operatorId } = req.body;

  // Get template tasks
  const tasks = await db
    .select()
    .from(templateTasks)
    .where(eq(templateTasks.templateId, templateId))
    .orderBy(templateTasks.orderIndex);

  // Create submission
  const [submission] = await db
    .insert(checklistSubmissions)
    .values({
      templateId,
      submittedBy: operatorId,
      status: 'in_progress',
    })
    .returning();

  // Initialize Colloki Flow session via API call
  await axios.post(
    'https://collokiflow.micapps.com/api/v1/run/YOUR_FLOW_ID',
    {
      action: 'initialize_session',
      phoneNumber,
      submissionId: submission.id,
      assignmentId: assignmentId || null,
      tasks: tasks.map(t => ({
        taskName: t.taskName,
        verificationCriteria: t.verificationCriteria,
      })),
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.COLLOKI_FLOW_API_KEY,
      },
    }
  );

  res.json({ success: true, submissionId: submission.id });
});
```

---

## ⚠️ **Critical Risks & Limitations**

### 1. **Data Loss**
- ❌ No incremental saves
- ❌ If session crashes, ALL answers lost
- ❌ Can't resume if operator disconnects

### 2. **Limited Visibility**
- ❌ Can't view in-progress checklists
- ❌ Supervisor can't see partial answers
- ❌ No real-time progress tracking

### 3. **Debugging Nightmare**
- ❌ Can't easily inspect session state
- ❌ Logs split between Colloki and backend
- ❌ Harder to trace issues

### 4. **Colloki Flow Single Point of Failure**
- ❌ If Colloki down, entire system stops
- ❌ No fallback mechanism
- ❌ Session data trapped in Colloki

### 5. **Feature Limitations**
- ❌ Can't cancel and save partial work
- ❌ Can't edit answers mid-way
- ❌ Can't add supervisor intervention

---

## ✅ **What You Gain**

1. ✅ Less backend code
2. ✅ Visual flow builder (easier for non-developers?)
3. ✅ Colloki manages conversation state
4. ✅ Backend only handles final persistence

---

## 🎯 **Recommendation**

**DO NOT DO THIS** unless you have a very specific reason.

**Keep the current architecture** because:
1. ✅ Incremental saves = no data loss
2. ✅ Full control and customization
3. ✅ Easy debugging
4. ✅ Real-time progress tracking
5. ✅ Backend and session state in same place
6. ✅ Can add features easily

**Your current setup is production-ready and robust!**

---

## 💡 **Alternative: Hybrid Approach**

If you want to reduce backend complexity:

```
1. Keep backend for:
   - Session management
   - Database persistence
   - Business logic
   
2. Use Colloki Flow only for:
   - AI interpretation
   - WhatsApp message delivery
```

**This is what you have now - it's optimal!**

---

**Last Updated**: November 19, 2025  
**Recommendation**: ❌ **DO NOT IMPLEMENT** - Current architecture is better
