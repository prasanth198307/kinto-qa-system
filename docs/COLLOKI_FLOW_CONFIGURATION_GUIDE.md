# Colloki Flow Configuration Guide
## How to Parse WhatsApp Parameters from input_value

**Date**: November 19, 2025  
**Flow ID**: `bab8b99c-4373-4138-878b-f8478c6c9d42`

---

## 📋 Current Status

### ✅ What's Working
- Backend sends correct format to Colloki Flow
- Colloki Flow receives the data successfully (response in ~2.7 seconds)
- Request format matches Java implementation exactly

### ❌ What Needs Configuration
- `WhatsAppOutput-uqikJ` component needs inputs configured
- Need to parse `input_value` string to extract Message, Phone, and Phone ID

---

## 🎯 Goal

Configure Colloki Flow to extract these values from the `input_value` string:

**Input String**:
```
"text: 📋 *Question 1 of 1*\n\nCheck oil level..., from: +919000151199, phoneNumberId: 859771513892440"
```

**Extract**:
- **Message**: `"📋 *Question 1 of 1*\n\nCheck oil level..."`
- **To Phone**: `"+919000151199"`
- **Phone ID**: `"859771513892440"`
- **Token**: `"<Your WhatsApp Access Token>"` (from environment)

---

## 🛠️ Step-by-Step Configuration

### Step 1: Log into Colloki Flow Dashboard

1. Open: https://collokiflow.micapps.com
2. Navigate to your flow: `bab8b99c-4373-4138-878b-f8478c6c9d42`
3. Open the flow editor

---

### Step 2: Add a "Python Code" or "Text Parser" Component

You need to add a component that can parse the `input_value` string. Options:

#### Option A: Python Code Component (Recommended)

Add a **Python Code** component with this logic:

```python
import re

def parse_whatsapp_params(input_value: str) -> dict:
    """
    Parse input_value format:
    "text: <message>, from: <phone>, phoneNumberId: <id>"
    """
    # Extract message (everything between "text: " and ", from:")
    message_match = re.search(r'text: (.*?), from:', input_value, re.DOTALL)
    message = message_match.group(1) if message_match else ""
    
    # Extract phone (everything between "from: " and ", phoneNumberId:")
    phone_match = re.search(r'from: (.*?), phoneNumberId:', input_value)
    phone = phone_match.group(1) if phone_match else ""
    
    # Extract phoneNumberId (everything after "phoneNumberId: ")
    phone_id_match = re.search(r'phoneNumberId: (.+)$', input_value)
    phone_id = phone_id_match.group(1) if phone_id_match else ""
    
    return {
        "message": message.strip(),
        "to_phone": phone.strip(),
        "phone_id": phone_id.strip()
    }

# Main execution
result = parse_whatsapp_params(input_value)
```

**Component Outputs**:
- `result.message` → Message text
- `result.to_phone` → Phone number
- `result.phone_id` → Phone Number ID

---

#### Option B: JavaScript Code Component

If Python is not available, use **JavaScript Code**:

```javascript
function parseWhatsAppParams(inputValue) {
    // Extract message (between "text: " and ", from:")
    const messageMatch = inputValue.match(/text: (.*?), from:/s);
    const message = messageMatch ? messageMatch[1] : "";
    
    // Extract phone (between "from: " and ", phoneNumberId:")
    const phoneMatch = inputValue.match(/from: (.*?), phoneNumberId:/);
    const phone = phoneMatch ? phoneMatch[1] : "";
    
    // Extract phoneNumberId (after "phoneNumberId: ")
    const phoneIdMatch = inputValue.match(/phoneNumberId: (.+)$/);
    const phoneId = phoneIdMatch ? phoneIdMatch[1] : "";
    
    return {
        message: message.trim(),
        to_phone: phone.trim(),
        phone_id: phoneId.trim()
    };
}

// Execute
const result = parseWhatsAppParams(input_value);
```

---

### Step 3: Connect Parser to Input

1. **Find the Input Component** that receives `input_value`
2. **Connect it to the Parser** (Python/JavaScript component)
3. **Pass `input_value`** as input to the parser

**Flow Diagram**:
```
[Input Component] 
       ↓ input_value
[Parser Component] 
       ↓ result.message, result.to_phone, result.phone_id
[WhatsAppOutput Component]
```

---

### Step 4: Configure WhatsAppOutput Component Inputs

Locate the **WhatsAppOutput-uqikJ** component and set these inputs:

| Input Field | Connect To | Example Value |
|-------------|------------|---------------|
| **Message** | `Parser.result.message` | `"📋 *Question 1 of 1*\n\nCheck oil level..."` |
| **To Phone** | `Parser.result.to_phone` | `"+919000151199"` |
| **Phone ID** | `Parser.result.phone_id` | `"859771513892440"` |
| **Token** | Environment Variable | `process.env.WHATSAPP_ACCESS_TOKEN` or your stored secret |

**Important**: Make sure the WhatsApp Access Token is configured in your Colloki Flow environment/secrets.

---

### Step 5: Save and Publish

1. **Save the flow** (click Save button)
2. **Publish the flow** (make it live)
3. **Test the flow** using the test endpoint

---

## 🧪 Testing the Configuration

### Test 1: Send a Test Request

Use this curl command to test:

```bash
curl -X POST "https://collokiflow.micapps.com/api/v1/run/bab8b99c-4373-4138-878b-f8478c6c9d42?stream=false" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "output_type": "chat",
    "input_type": "chat",
    "input_value": "text: Test message from Colloki Flow, from: +919000151199, phoneNumberId: 859771513892440",
    "session_id": "+919000151199"
  }'
```

### Test 2: Check Response

**Expected Success Response**:
```json
{
  "outputs": [{
    "outputs": [{
      "results": {
        "message": {
          "text": "WhatsApp message sent successfully",
          "data": {
            "message_id": "wamid.HBgM..."
          }
        }
      }
    }]
  }]
}
```

**Current Error Response** (before fix):
```json
{
  "text": "Error: Missing one or more required inputs (Message, To Phone, Phone ID, Token)."
}
```

### Test 3: Verify WhatsApp Delivery

Check that **+919000151199** receives the message on WhatsApp.

---

## 🔍 Debugging Tips

### Issue: Parser Not Extracting Values

**Check**:
1. Is the parser component connected to `input_value`?
2. Are the regex patterns correct?
3. Is the parser output being logged?

**Debug**:
- Add logging in the parser to print extracted values
- Use Colloki Flow's debug mode to inspect values at each step

---

### Issue: WhatsAppOutput Still Shows Error

**Check**:
1. Are all 4 inputs connected? (Message, To Phone, Phone ID, Token)
2. Is the Token valid and not empty?
3. Are the extracted values being passed correctly?

**Debug**:
- Add a "Debug/Print" component after parser to verify values
- Check Colloki Flow execution logs

---

### Issue: WhatsApp Message Not Delivered

**Check**:
1. Is the WhatsApp Phone Number ID correct? (`859771513892440`)
2. Is the WhatsApp Access Token valid?
3. Is the recipient phone number in correct format? (`+919000151199`)

**Debug**:
- Test WhatsAppOutput component directly with hardcoded values
- Check Meta WhatsApp Business Manager for delivery status

---

## 📊 Expected Flow Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Input (API Request)                                        │
│  - input_value: "text: ..., from: ..., phoneNumberId: ..." │
│  - session_id: "+919000151199"                             │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  Parser Component (Python/JavaScript)                       │
│  Extracts:                                                  │
│  - message = "📋 *Question 1 of 1*..."                     │
│  - to_phone = "+919000151199"                              │
│  - phone_id = "859771513892440"                            │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  WhatsAppOutput Component (WhatsAppOutput-uqikJ)           │
│  Inputs:                                                    │
│  - Message: Parser.message                                 │
│  - To Phone: Parser.to_phone                               │
│  - Phone ID: Parser.phone_id                               │
│  - Token: Environment.WHATSAPP_ACCESS_TOKEN                │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  WhatsApp Delivery                                          │
│  ✅ Message sent to +919000151199                          │
│  📱 Operator receives question on WhatsApp                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Validation Checklist

After configuration, verify:

- [ ] Parser component added and connected to `input_value`
- [ ] Parser extracts `message`, `to_phone`, `phone_id` correctly
- [ ] WhatsAppOutput component receives all 4 inputs
- [ ] WhatsApp Access Token is configured and valid
- [ ] Flow is saved and published
- [ ] Test request returns success (not error)
- [ ] WhatsApp message is delivered to recipient
- [ ] Response time is ~3-5 seconds (not timeout)

---

## 📞 Support

**If you encounter issues**:

1. **Check Colloki Flow Logs**: Look for execution errors in the flow logs
2. **Test Components Individually**: Test parser and WhatsAppOutput separately
3. **Verify Credentials**: Ensure WhatsApp Phone ID and Token are correct
4. **Contact Colloki Flow Support**: If component configuration issues persist

---

## 🔗 Quick Reference

**Flow URL**: https://collokiflow.micapps.com/flows/bab8b99c-4373-4138-878b-f8478c6c9d42  
**Component ID**: `WhatsAppOutput-uqikJ`  
**Input Format**: `"text: <message>, from: <phone>, phoneNumberId: <id>"`

**Extraction Logic**:
- Message: Between `"text: "` and `", from:"`
- Phone: Between `"from: "` and `", phoneNumberId:"`
- Phone ID: After `"phoneNumberId: "`

---

**Last Updated**: November 19, 2025  
**Status**: ✅ CONFIGURED & WORKING
