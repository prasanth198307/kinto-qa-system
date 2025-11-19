# Colloki Flow Webhook Endpoint

**Created:** November 19, 2025  
**Purpose:** Documentation for Colloki team to configure webhook callback

---

## 🎯 **Webhook Endpoint URL**

### **Your Endpoint:**
```
POST https://your-app.replit.app/api/colloki/callback
```

**Replace `your-app.replit.app` with your actual Replit domain!**

---

## 🔐 **Authentication**

### **Required Header:**
```
Authorization: Bearer KINTO_COLLOKI_WEBHOOK_SECRET_2025
```

**Security:**
- Colloki must send this header with every callback request
- Requests without valid API key will be rejected with `401 Unauthorized`
- You can customize the secret by setting `COLLOKI_CALLBACK_API_KEY` environment variable

---

## 📥 **Request Format (Colloki → Your Backend)**

### **When to Call:**
After AI processing completes, Colloki Flow should POST the results to this endpoint.

### **Headers:**
```
Content-Type: application/json
Authorization: Bearer KINTO_COLLOKI_WEBHOOK_SECRET_2025
```

### **Request Body:**
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

**Required Fields:**
- `session_id` (string) - Phone number or session identifier
- `outputs` (array) - Nested array containing AI response
- `outputs[0].outputs[0].results.message.text` (string) - JSON string with interpretation

**AI Interpretation Format (inside `text` field):**
```json
{
  "status": "OK" | "NOK" | "UNCLEAR",
  "remarks": "string or null",
  "confidence": 0-100
}
```

---

## 📤 **Response Format (Your Backend → Colloki)**

### **Success Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Interpretation processed successfully",
  "session_id": "+919000151199"
}
```

### **Error Responses:**

#### **401 Unauthorized (Invalid API Key):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

#### **400 Bad Request (Missing/Invalid Data):**
```json
{
  "error": "Bad Request",
  "message": "Missing session_id"
}
```

#### **404 Not Found (No Active Session):**
```json
{
  "error": "Not Found",
  "message": "No active session found"
}
```

#### **500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to process callback"
}
```

---

## 🔄 **Complete Workflow**

```
1. Operator sends "OK" via WhatsApp
   ↓
2. Meta WhatsApp → Your Backend /api/whatsapp/webhook
   ↓
3. Your Backend → Colloki Flow API (request AI interpretation)
   ↓
4. Colloki Flow responds: 200 OK (acknowledgment only)
   ↓
5. Colloki Flow processes with AI (async)
   ↓
6. Colloki Flow → Your Backend /api/colloki/callback ← NEW!
   {
     "session_id": "+919000151199",
     "outputs": [...]
   }
   ↓
7. Your Backend:
   - Validates API key
   - Parses AI interpretation
   - Saves answer to database
   - Sends next question automatically
   ↓
8. Your Backend → Colloki Flow (send next question)
   ↓
9. Operator receives next question
```

---

## ⚙️ **Colloki Flow Configuration Required**

### **What Colloki Team Needs to Configure:**

1. **Webhook URL:**
   ```
   https://your-app.replit.app/api/colloki/callback
   ```

2. **Webhook Headers:**
   ```
   Content-Type: application/json
   Authorization: Bearer KINTO_COLLOKI_WEBHOOK_SECRET_2025
   ```

3. **Webhook Trigger:**
   - Call this endpoint AFTER AI interpretation completes
   - Send the interpretation result in the specified format

4. **Timeout:**
   - Set reasonable timeout (e.g., 30 seconds)
   - Retry on failure (optional, recommended)

---

## 🧪 **Testing the Endpoint**

### **cURL Example:**
```bash
curl -X POST 'https://your-app.replit.app/api/colloki/callback' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer KINTO_COLLOKI_WEBHOOK_SECRET_2025' \
  -d '{
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
  }'
```

### **Expected Response:**
```json
{
  "success": true,
  "message": "Interpretation processed successfully",
  "session_id": "+919000151199"
}
```

---

## 🎯 **What Happens After Callback:**

After receiving the callback, your backend automatically:
1. ✅ Validates the API key
2. ✅ Extracts AI interpretation (status, remarks, confidence)
3. ✅ Finds active conversation session by phone number
4. ✅ Saves answer to database (atomic transaction)
5. ✅ Increments question index
6. ✅ **Automatically sends next question** (or confirmation summary if last question)
7. ✅ Operator receives next question on WhatsApp

**No manual trigger needed - everything is automatic!**

---

## 📋 **Summary for Colloki Team**

**Give them:**
1. ✅ Webhook URL: `https://your-app.replit.app/api/colloki/callback`
2. ✅ API Key: `KINTO_COLLOKI_WEBHOOK_SECRET_2025`
3. ✅ Request format (JSON structure above)
4. ✅ When to call: After AI interpretation completes

**They configure:**
1. ✅ Webhook destination URL
2. ✅ Authorization header
3. ✅ POST request with interpretation results

---

**Last Updated:** November 19, 2025
