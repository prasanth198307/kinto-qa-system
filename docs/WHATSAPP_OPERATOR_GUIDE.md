# WhatsApp Interactive Checklist - Operator Guide

**For Operators**: How to complete checklists via WhatsApp

---

## 📱 How It Works

When assigned a checklist, you'll receive WhatsApp messages with questions. Answer each one to progress through the checklist.

---

## 🎯 Step-by-Step Flow

### Step 1: Receive First Question

You'll receive a message like:

```
📋 *Question 1 of 5*

Check oil level

_Level must be between MIN and MAX_

Reply with:
✅ OK - if task is complete
❌ NOK - if there's an issue

For NOK, add remarks:
NOK - describe the problem

You can also send a photo if needed.
```

---

### Step 2: Respond to Each Question

You have **3 ways** to respond:

#### Option A: Simple OK ✅
```
OK
```
**Result**: Question marked as complete → Next question sent automatically

---

#### Option B: Simple NOK with Remarks ❌
```
NOK - Oil level is below MIN mark
```
**Result**: Question marked as failed with your remarks → Next question sent automatically

---

#### Option C: Photo + Text 📸
**Send a photo first**, then send text:
```
NOK - Visible leak detected
```
**Result**: Photo attached to answer, remarks recorded → Next question sent automatically

**OR send photo with caption:**
```
Photo caption: OK - Level is good
```
**Result**: Photo + answer recorded → Next question sent automatically

---

### Step 3: AI Interprets Your Response

The system uses **AI to understand** your response:

| You Say | AI Interprets As | Confidence |
|---------|------------------|------------|
| `OK` | ✅ Task Complete | 95% |
| `ok - done` | ✅ Task Complete | 95% |
| `NOK - leak found` | ❌ Issue (Remarks: "leak found") | 95% |
| `not working` | ❌ Issue (Remarks: "not working") | 75% |
| `good` | ✅ Task Complete | 80% |
| `problem with valve` | ❌ Issue (Remarks: "problem with valve") | 75% |

**If unclear** (confidence < 70%), you'll be asked to clarify:
```
❌ Please reply with:
✅ OK - if complete
❌ NOK - if there's an issue
```

---

### Step 4: Progress Through Questions

Each time you answer, the **next question is sent automatically**:

```
📋 *Question 2 of 5*

Check coolant level

_Must be within green zone_

Reply with:
✅ OK - if task is complete
❌ NOK - if there's an issue
```

**Continue answering** until all questions are completed.

---

### Step 5: Review & Confirm (Final Step)

After the **last question**, you'll receive a **summary**:

```
✅ *All Questions Answered!*

📋 *Your Answers:*

1. ✅ Check oil level
   Result: OK

2. ❌ Check coolant level
   Result: NOK
   Remarks: Coolant level low

3. ✅ Check brake fluid
   Result: OK

4. ✅ Inspect belts
   Result: OK
   📸 Photo attached

5. ❌ Check tire pressure
   Result: NOK
   Remarks: Front left tire low

━━━━━━━━━━━━━━━━━━

Reply with:
✅ *CONFIRM* - to submit
❌ *CANCEL* - to discard
```

---

### Step 6: Submit or Cancel

#### To Submit ✅
Reply with any of:
- `CONFIRM`
- `YES`
- `SUBMIT`

**Result**: 
```
✅ *Checklist Submitted Successfully!*

Thank you for completing the checklist. 
Your supervisor has been notified.
```

---

#### To Cancel ❌
Reply with any of:
- `CANCEL`
- `NO`

**Result**:
```
❌ *Checklist Cancelled*

Your answers have been discarded.
```

---

## 📋 Quick Reference

### Valid Responses for Questions

| Response Type | Example | Next Action |
|---------------|---------|-------------|
| **Simple OK** | `OK` | ✅ Next question |
| **OK with note** | `OK - all good` | ✅ Next question |
| **Simple NOK** | `NOK` | ❌ Next question (prompted for remarks) |
| **NOK with remarks** | `NOK - found leak` | ❌ Next question |
| **Photo only** | *Send photo* | ⏳ Waiting for text |
| **Photo + text** | *Photo* then `OK` | ✅ Next question |
| **Photo with caption** | Photo caption: `OK` | ✅ Next question |

### Valid Confirmation Responses

| To Submit | To Cancel |
|-----------|-----------|
| `CONFIRM` | `CANCEL` |
| `YES` | `NO` |
| `SUBMIT` | - |

---

## 🔍 Examples

### Example 1: All Tasks OK
```
📋 Question 1 of 3
Check oil level
```
**You**: `OK`

```
📋 Question 2 of 3
Check coolant level
```
**You**: `OK`

```
📋 Question 3 of 3
Check brake fluid
```
**You**: `OK`

```
✅ All Questions Answered!
📋 Your Answers:
1. ✅ Check oil level - OK
2. ✅ Check coolant level - OK
3. ✅ Check brake fluid - OK

Reply with:
✅ CONFIRM - to submit
❌ CANCEL - to discard
```
**You**: `CONFIRM`

```
✅ Checklist Submitted Successfully!
```

---

### Example 2: Mixed Responses with Photos
```
📋 Question 1 of 3
Check oil level
```
**You**: Send photo, then `OK - level is good`

```
📋 Question 2 of 3
Check coolant level
```
**You**: `NOK - coolant is low`

```
📋 Question 3 of 3
Check brake fluid
```
**You**: Send photo with caption: `NOK - brake fluid contaminated`

```
✅ All Questions Answered!
📋 Your Answers:
1. ✅ Check oil level - OK
   Remarks: level is good
   📸 Photo attached
2. ❌ Check coolant level - NOK
   Remarks: coolant is low
3. ❌ Check brake fluid - NOK
   Remarks: brake fluid contaminated
   📸 Photo attached

Reply with:
✅ CONFIRM - to submit
❌ CANCEL - to discard
```
**You**: `CONFIRM`

```
✅ Checklist Submitted Successfully!
```

---

### Example 3: Unclear Response
```
📋 Question 1 of 2
Check oil level
```
**You**: `maybe`

```
❌ Please reply with:
✅ OK - if complete
❌ NOK - if there's an issue
```
**You**: `OK`

```
📋 Question 2 of 2
Check coolant level
```
*Continues normally...*

---

## ⏱️ Session Timeout

- Sessions expire after **24 hours**
- If expired, you'll see:
```
⏱️ This checklist session has expired. 
Please contact your supervisor.
```

---

## ❓ FAQs

### Q: What if I make a mistake?
**A**: You can cancel at the confirmation step and ask your supervisor to reassign.

### Q: Can I send multiple photos?
**A**: Yes! Send photos first, then your response text. All photos sent before the text will be attached.

### Q: What if I don't know the answer?
**A**: Reply with `NOK - need supervisor assistance` so your supervisor is notified.

### Q: Can I use lowercase?
**A**: Yes! `ok`, `OK`, `Ok` all work. Same for NOK.

### Q: What happens after I submit?
**A**: Your supervisor receives the completed checklist with all your answers and photos. The submission is saved in the system.

---

## 🎯 Best Practices

1. ✅ **Be specific** with NOK remarks
   - Good: `NOK - Front left tire pressure 25 PSI (should be 32)`
   - Bad: `NOK - tire issue`

2. 📸 **Use photos** for visual evidence
   - Take clear, well-lit photos
   - Include context (e.g., gauge readings)

3. ⚡ **Respond promptly**
   - Sessions expire after 24 hours
   - Faster responses = faster supervisor feedback

4. ✔️ **Double-check** before CONFIRM
   - Review the summary carefully
   - Make sure all answers are accurate

---

**Need Help?** Contact your supervisor if you encounter any issues.

---

**Last Updated**: November 19, 2025
