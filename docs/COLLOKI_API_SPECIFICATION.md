# Colloki Flow API Specification

**Purpose:** Document expected request/response format between KINTO backend and Colloki Flow API

---

## 📤 **Request Format (KINTO → Colloki Flow)**

### **Endpoint:**
```
POST https://collokiflow.micapps.com/api/v1/run/bab8b99c-4373-4138-878b-f8478c6c9d42?stream=false
```

### **Headers:**
```
Content-Type: application/json
x-api-key: sk-WFgOK7dawJ3uc0AOZwBeKIrs3cvn9ScgM8_zxJobh34
```

### **Request Body:**
```json
{
  "output_type": "chat",
  "input_type": "chat",
  "input_value": "<prompt_or_message_text>",
  "session_id": "<phone_number_or_session_id>"
}
```

---

## 📥 **Response Format (Colloki Flow → KINTO)**

### **Use Case 1: AI Interpretation**

**Request:**
```json
{
  "output_type": "chat",
  "input_type": "chat",
  "input_value": "You are analyzing an operator's response for a checklist task...\n\nOperator's response: \"OK\"\n\nRespond in JSON format:\n{\"status\":\"OK\"|\"NOK\"|\"UNCLEAR\",\"remarks\":\"...\",\"confidence\":0-100}",
  "session_id": "+919000151199"
}
```

**Expected Response:**
```json
{
  "session_id": "+919000151199",
  "outputs": [
    {
      "outputs": [
        {
          "results": {
            "message": {
              "text": "{\"status\":\"OK\",\"remarks\":null,\"confidence\":95}"
            }
          }
        }
      ]
    }
  ]
}
```

**Response Structure:**
- Status: `200 OK`
- Content-Type: `application/json`
- Body: Nested JSON structure containing AI response in `outputs[0].outputs[0].results.message.text`

---

### **Use Case 2: WhatsApp Message Delivery**

**Request:**
```json
{
  "output_type": "chat",
  "input_type": "chat",
  "input_value": "text: 📋 Question 2 of 5\n\nCheck brake fluid level\n\nReply with:\n✅ OK - if task is complete\n❌ NOK - if there's an issue, from: +919000151199, phoneNumberId: 438710549318983",
  "session_id": "+919000151199"
}
```

**Expected Response:**
```json
{
  "session_id": "+919000151199",
  "outputs": []
}
```

**Response Structure:**
- Status: `200 OK`
- Content-Type: `application/json`
- Body: Empty `outputs` array indicates successful message delivery
- Message is sent to WhatsApp via configured parser component

---

## 🔧 **Parser Component Configuration**

Colloki Flow should have a **parser component** that extracts parameters from `input_value`:

**Input Format:**
```
text: <message_content>, from: <phone_number>, phoneNumberId: <whatsapp_phone_id>
```

**Extracted Parameters:**
- `message`: Text between `"text:"` and `", from:"`
- `to_phone`: Text between `"from:"` and `", phoneNumberId:"`
- `phone_id`: Text after `"phoneNumberId:"`

**Example:**
```
Input: "text: Hello, from: +919000151199, phoneNumberId: 123456"

Extracted:
- message: "Hello"
- to_phone: "+919000151199"
- phone_id: "123456"
```

---

## ❌ **Error Response Format**

**HTTP Status Codes:**
- `400 Bad Request` - Invalid input format
- `401 Unauthorized` - Invalid API key
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Colloki Flow error
- `503 Service Unavailable` - Temporary downtime

**Error Response Body:**
```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {
      "field": "Additional error context"
    }
  }
}
```

**Example Error:**
```json
{
  "error": {
    "message": "Invalid API key",
    "code": "UNAUTHORIZED",
    "details": {
      "provided_key": "sk-xxx***"
    }
  }
}
```

---

## ⏱️ **Performance Requirements**

- **Response Time:** < 2 seconds (average)
- **Timeout:** 10 seconds (KINTO backend timeout)
- **Availability:** 99.9% uptime

---

## 🔐 **Authentication**

**Method:** API Key in header
```
x-api-key: sk-WFgOK7dawJ3uc0AOZwBeKIrs3cvn9ScgM8_zxJobh34
```

**Security:**
- API key should remain confidential
- HTTPS required for all requests
- No database credentials shared with Colloki

---

## 📊 **Sample cURL Requests**

### **AI Interpretation:**
```bash
curl -X POST 'https://collokiflow.micapps.com/api/v1/run/bab8b99c-4373-4138-878b-f8478c6c9d42?stream=false' \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: sk-WFgOK7dawJ3uc0AOZwBeKIrs3cvn9ScgM8_zxJobh34' \
  -d '{
    "output_type": "chat",
    "input_type": "chat",
    "input_value": "Analyze: OK",
    "session_id": "+919000151199"
  }'
```

### **WhatsApp Message:**
```bash
curl -X POST 'https://collokiflow.micapps.com/api/v1/run/bab8b99c-4373-4138-878b-f8478c6c9d42?stream=false' \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: sk-WFgOK7dawJ3uc0AOZwBeKIrs3cvn9ScgM8_zxJobh34' \
  -d '{
    "output_type": "chat",
    "input_type": "chat",
    "input_value": "text: Hello World, from: +919000151199, phoneNumberId: 123456",
    "session_id": "+919000151199"
  }'
```

---

## 🎯 **Summary for Colloki Team**

**What KINTO Expects:**

1. **Consistent Response Structure:**
   - Always return `200 OK` for successful requests
   - Always include `session_id` in response
   - AI responses in `outputs[0].outputs[0].results.message.text`
   - WhatsApp delivery confirmed by empty `outputs: []`

2. **Parser Component:**
   - Extract `message`, `to_phone`, `phone_id` from `input_value`
   - Format: `"text: X, from: Y, phoneNumberId: Z"`
   - Send extracted message to WhatsApp number

3. **Error Handling:**
   - Return proper HTTP status codes
   - Include descriptive error messages
   - Provide error details for debugging

4. **Performance:**
   - Respond within 2 seconds (average)
   - Handle concurrent requests from same session
   - Support rate limiting if needed

---

**Last Updated:** November 19, 2025
**Contact:** KINTO Development Team
