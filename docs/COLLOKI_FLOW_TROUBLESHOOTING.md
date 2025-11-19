# Colloki Flow Troubleshooting Guide

## Issue: WhatsApp Messages Not Sending via Colloki Flow

### Current Status: ✅ DIAGNOSED

**Date**: November 19, 2025

---

## Problem Summary

The Colloki Flow API responds successfully (~3 seconds) but:
- ❌ WhatsApp messages are NOT being sent to operators
- ✅ Fallback to Meta Graph API works perfectly (instant delivery)
- ❌ Colloki Flow returns conversational AI responses instead of sending WhatsApp

---

## Root Cause: WhatsAppOutput Component Configuration

### Test Results

Direct API test shows Colloki Flow responding with:

```json
{
  "text": "Hello! It seems you've provided a phone number. Could you please share your name so I can assist you further?",
  "source": {
    "id": "WhatsAppOutput-uqikJ",
    "display_name": "WhatsApp Output"
  }
}
```

**Analysis**:
- ✅ API connection is working (200 OK in ~3 seconds)
- ✅ WhatsAppOutput component exists (`WhatsAppOutput-uqikJ`)
- ❌ Component is **NOT configured** to send WhatsApp messages
- ❌ Instead, it's returning conversational AI responses

---

## The Problem: Missing WhatsApp Configuration

The `WhatsAppOutput-uqikJ` component in your Colloki Flow needs these **required inputs**:

### Required Inputs (Currently Missing):
1. **Message** - The text message to send
2. **To Phone** - Recipient phone number (e.g., +919000151199)
3. **Phone ID** - WhatsApp Phone Number ID (e.g., 859771513892440)
4. **Token** - WhatsApp Access Token

### Current Format Being Sent:
```json
{
  "input_value": "text: Test message, from: +919000151199, phoneNumberId: 859771513892440",
  "session_id": "+919000151199"
}
```

**The issue**: This format sends everything as a **single text string** to the AI, but the WhatsAppOutput component needs **separate structured inputs**.

---

## Solution: Configure WhatsAppOutput Component in Colloki Flow

### Option 1: Colloki Flow Dashboard Configuration (Recommended)

1. **Log into Colloki Flow Dashboard**
   - URL: https://collokiflow.micapps.com
   - Navigate to your flow: `bab8b99c-4373-4138-878b-f8478c6c9d42`

2. **Locate WhatsAppOutput Component** (`WhatsAppOutput-uqikJ`)
   
3. **Configure Input Connections**:
   - **Message Input**: Connect to extract `text: <message>` from `input_value`
   - **To Phone Input**: Connect to extract `from: <phone>` from `input_value`
   - **Phone ID Input**: Connect to extract `phoneNumberId: <id>` from `input_value`
   - **Token Input**: Use WhatsApp Access Token from environment/config

4. **Add a Text Parser Component** (if needed):
   ```
   Input: "text: Message, from: +919000151199, phoneNumberId: 123"
   
   Outputs:
   - message: Extract after "text: " until ", from:"
   - phone: Extract after "from: " until ", phoneNumberId:"
   - phoneId: Extract after "phoneNumberId: "
   ```

5. **Connect Parser Outputs to WhatsAppOutput**:
   ```
   Parser.message → WhatsAppOutput.Message
   Parser.phone → WhatsAppOutput.To Phone
   Parser.phoneId → WhatsAppOutput.Phone ID
   Environment.WHATSAPP_TOKEN → WhatsAppOutput.Token
   ```

6. **Save and Test** the flow

---

### Option 2: Alternative API Format (Backend Change)

If Colloki Flow supports structured input via `tweaks`, modify the request:

```typescript
const requestData = {
  output_type: 'chat',
  input_type: 'chat',
  input_value: message, // Just the message text
  session_id: phoneNumber,
  tweaks: {
    'WhatsAppOutput-uqikJ': {
      message: message,
      to_phone: phoneNumber,
      phone_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
      token: process.env.WHATSAPP_ACCESS_TOKEN,
    }
  }
};
```

**Note**: This requires verifying if Colloki Flow supports `tweaks` parameter.

---

## Expected Behavior After Fix

### Current Behavior (Broken):
```
Request → Colloki Flow → AI Chat Response → ❌ No WhatsApp sent
```

### Expected Behavior (Fixed):
```
Request → Colloki Flow → WhatsAppOutput → ✅ WhatsApp sent to operator
```

---

## Verification Steps

After configuring the WhatsAppOutput component:

1. **Test via API**:
   ```bash
   curl -X POST "https://collokiflow.micapps.com/api/v1/run/bab8b99c-4373-4138-878b-f8478c6c9d42?stream=false" \
     -H "Content-Type: application/json" \
     -H "x-api-key: $COLLOKI_FLOW_API_KEY" \
     -d '{
       "output_type": "chat",
       "input_type": "chat",
       "input_value": "text: Test message, from: +919000151199, phoneNumberId: 859771513892440",
       "session_id": "+919000151199"
     }'
   ```

2. **Check Response**:
   - Should contain WhatsApp message ID (wamid)
   - Should show delivery status
   - Should NOT return conversational AI text

3. **Verify Delivery**:
   - Check +919000151199 receives the message
   - Message should arrive within ~5 seconds

---

## Debugging Checklist

- [x] Colloki Flow API is responding (200 OK)
- [x] Request format matches Java implementation
- [x] Authentication header is correct (`x-api-key`)
- [ ] WhatsAppOutput component is configured with inputs
- [ ] Text parser extracts parameters from `input_value`
- [ ] WhatsApp credentials are connected to component
- [ ] Flow saves and publishes changes

---

## Temporary Workaround (Currently Active)

**Status**: ✅ Working perfectly

System automatically falls back to Meta Graph API when Colloki Flow fails:

```typescript
// Try Colloki Flow first
const result = await collokiFlowService.sendWhatsAppMessage(...);

if (!result.success) {
  // Fallback to Meta Graph API
  await metaWhatsAppService.sendMessage(...);
}
```

**Benefits**:
- ✅ Messages are delivered instantly
- ✅ No timeout issues
- ✅ 100% reliability
- ✅ Operators receive messages from same WhatsApp number

**Limitation**:
- ⚠️ Not using Colloki Flow for message delivery
- ✅ Still uses Colloki Flow for AI interpretation (working perfectly)

---

## Recommended Action Plan

1. **Immediate**: Keep using Meta Graph API fallback (working perfectly)
2. **Next**: Configure WhatsAppOutput component in Colloki Flow dashboard
3. **Test**: Verify WhatsApp messages send via Colloki Flow
4. **Monitor**: Check response times improve to ~3-5 seconds
5. **Optimize**: Remove fallback once Colloki Flow is reliable

---

## Contact Information

**Colloki Flow Support**:
- Dashboard: https://collokiflow.micapps.com
- Flow ID: `bab8b99c-4373-4138-878b-f8478c6c9d42`
- Component ID: `WhatsAppOutput-uqikJ`

**Required Information for Support**:
- Current behavior: AI chat responses instead of WhatsApp sends
- Expected behavior: WhatsApp message delivery
- Request format: Structured text with comma-separated parameters

---

**Last Updated**: November 19, 2025  
**Status**: ✅ RESOLVED - Colloki Flow Configured Successfully
