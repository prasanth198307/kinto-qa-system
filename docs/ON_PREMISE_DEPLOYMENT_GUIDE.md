# On-Premise Deployment Guide - Webhook Architecture

**Last Updated:** November 19, 2025  
**Purpose:** Configure webhook reception for on-premise KINTO deployments

---

## 🎯 **Recommended: Cloud Queue Architecture**

For secure, scalable production deployments behind corporate firewalls.

---

## 📐 **Architecture Overview**

```
Internet                     Company Firewall         On-Premise
─────────────────────────────────┼───────────────────────────────
                                 │
Colloki Flow                     │
    ↓                            │
AWS Lambda (Public)              │
    ↓                            │
AWS SQS Queue ←──────────────────┼───────── Worker (Polls)
                   Outbound ✅   │              ↓
                                 │         Your Server
                                 │         (Processes webhooks)
```

**Key Benefit:** Only requires **OUTBOUND** connection from your server!

---

## 🚀 **Step-by-Step Setup**

### **Step 1: Create AWS SQS Queue**

1. Login to AWS Console
2. Navigate to **SQS** service
3. Click **Create Queue**
4. Configure:
   - **Name:** `kinto-colloki-webhooks`
   - **Type:** Standard
   - **Visibility Timeout:** 60 seconds
   - **Message Retention:** 4 days
   - **Receive Message Wait Time:** 20 seconds (long polling)
5. Click **Create Queue**
6. **Copy Queue URL** (looks like: `https://sqs.us-east-1.amazonaws.com/123456789/kinto-colloki-webhooks`)

---

### **Step 2: Create AWS Lambda Function**

1. Navigate to **Lambda** service
2. Click **Create Function**
3. Configure:
   - **Name:** `kinto-colloki-webhook-receiver`
   - **Runtime:** Node.js 20.x
   - **Architecture:** arm64
4. Click **Create Function**

5. **Add environment variables:**
   - `COLLOKI_API_KEY`: `KINTO_COLLOKI_WEBHOOK_SECRET_2025`
   - `SQS_QUEUE_URL`: `<Your Queue URL from Step 1>`

6. **Add SQS permissions to Lambda role:**
   - Go to Configuration → Permissions
   - Click on Role name
   - Add policy: `AmazonSQSFullAccess`

7. **Deploy Lambda code:**

```javascript
// index.mjs
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: 'us-east-1' });
const QUEUE_URL = process.env.SQS_QUEUE_URL;
const API_KEY = process.env.COLLOKI_API_KEY;

export const handler = async (event) => {
  console.log('Received webhook:', JSON.stringify(event, null, 2));

  // Validate API key
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const providedKey = authHeader?.replace('Bearer ', '');

  if (providedKey !== API_KEY) {
    console.error('Invalid API key');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  // Parse body
  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (error) {
    console.error('Invalid JSON body');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  // Enqueue to SQS
  try {
    await sqs.send(new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(body)
    }));

    console.log('Message enqueued successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Webhook received and queued'
      })
    };
  } catch (error) {
    console.error('SQS error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

8. **Create Function URL:**
   - Go to Configuration → Function URL
   - Click **Create Function URL**
   - Auth type: **NONE** (we handle auth in code)
   - Click **Save**
   - **Copy Function URL** (looks like: `https://abc123xyz.lambda-url.us-east-1.on.aws/`)

---

### **Step 3: Configure On-Premise Worker**

Create a background worker that polls the SQS queue:

```bash
# Install AWS SDK
npm install @aws-sdk/client-sqs
```

**Create worker file:**

```typescript
// server/collokiQueueWorker.ts
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { whatsappConversationService } from './whatsappConversationService';
import { db } from './db';
import { whatsappConversationSessions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const sqs = new SQSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const QUEUE_URL = process.env.AWS_SQS_QUEUE_URL!;

async function processCollokiWebhook(webhookData: any) {
  try {
    const { session_id, outputs } = webhookData;

    if (!session_id) {
      console.error('[QUEUE WORKER] Missing session_id');
      return;
    }

    // Extract AI interpretation
    const aiText = outputs?.[0]?.outputs?.[0]?.results?.message?.text || '';
    
    if (!aiText) {
      console.error('[QUEUE WORKER] No AI response text');
      return;
    }

    // Parse AI response
    let interpretation;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        interpretation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (error) {
      console.error('[QUEUE WORKER] Parse error:', error);
      return;
    }

    // Find active session
    const phoneNumber = session_id;
    const [session] = await db
      .select()
      .from(whatsappConversationSessions)
      .where(
        and(
          eq(whatsappConversationSessions.phoneNumber, phoneNumber),
          eq(whatsappConversationSessions.status, 'active')
        )
      );

    if (!session) {
      console.error('[QUEUE WORKER] No active session:', phoneNumber);
      return;
    }

    // Process interpretation
    const result: 'OK' | 'NOK' = interpretation.status === 'NOK' ? 'NOK' : 'OK';
    const remarks = interpretation.remarks || '';

    // Save and progress
    await whatsappConversationService.saveAnswerAndProgress(session.id, {
      result,
      remarks,
      photoUrl: undefined
    });

    console.log('[QUEUE WORKER] Successfully processed:', phoneNumber);

  } catch (error) {
    console.error('[QUEUE WORKER] Processing error:', error);
    throw error; // Re-throw to prevent message deletion
  }
}

async function pollQueue() {
  console.log('[QUEUE WORKER] Starting to poll SQS queue...');
  
  while (true) {
    try {
      const response = await sqs.send(new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20, // Long polling
        VisibilityTimeout: 60
      }));

      const messages = response.Messages || [];
      
      if (messages.length > 0) {
        console.log(`[QUEUE WORKER] Received ${messages.length} messages`);
      }

      for (const message of messages) {
        try {
          const webhookData = JSON.parse(message.Body!);
          
          // Process webhook
          await processCollokiWebhook(webhookData);
          
          // Delete message from queue (only if processed successfully)
          await sqs.send(new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle!
          }));
          
          console.log('[QUEUE WORKER] Message deleted from queue');
          
        } catch (error) {
          console.error('[QUEUE WORKER] Message processing failed:', error);
          // Message will become visible again for retry
        }
      }
      
    } catch (error) {
      console.error('[QUEUE WORKER] Polling error:', error);
      // Wait 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Start polling
pollQueue().catch(error => {
  console.error('[QUEUE WORKER] Fatal error:', error);
  process.exit(1);
});
```

**Update environment variables (.env):**
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/kinto-colloki-webhooks
```

**Start worker:**
```bash
# Add to package.json scripts:
"worker": "tsx server/collokiQueueWorker.ts"

# Run:
npm run worker
```

---

### **Step 4: Configure Colloki Flow**

**Give Colloki team:**
- **Webhook URL:** `https://abc123xyz.lambda-url.us-east-1.on.aws/`
- **Authorization Header:** `Bearer KINTO_COLLOKI_WEBHOOK_SECRET_2025`
- **Request Format:** Same as before

---

## ✅ **Testing**

### **Test 1: Send Test Webhook**
```bash
curl -X POST 'https://abc123xyz.lambda-url.us-east-1.on.aws/' \
  -H 'Authorization: Bearer KINTO_COLLOKI_WEBHOOK_SECRET_2025' \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "+919000151199",
    "outputs": [{
      "outputs": [{
        "results": {
          "message": {
            "text": "{\"status\":\"OK\",\"remarks\":null,\"confidence\":95}"
          }
        }
      }]
    }]
  }'
```

**Expected:**
```json
{"success":true,"message":"Webhook received and queued"}
```

### **Test 2: Check SQS Queue**
1. AWS Console → SQS → Your Queue
2. Click **Send and receive messages**
3. Click **Poll for messages**
4. You should see the webhook in the queue

### **Test 3: Check Worker Logs**
```bash
# Your on-premise worker should show:
[QUEUE WORKER] Received 1 messages
[QUEUE WORKER] Successfully processed: +919000151199
[QUEUE WORKER] Message deleted from queue
```

---

## 💰 **Costs**

**AWS Free Tier (12 months):**
- Lambda: 1M requests/month FREE
- SQS: 1M messages/month FREE

**Beyond Free Tier:**
- Lambda: $0.20 per 1M requests
- SQS: $0.40 per 1M requests
- **Total:** ~$0.60 per 1M webhooks

**For 1000 checklists/day:**
- ~30,000 webhooks/month
- Cost: **$0.02/month** (essentially free!)

---

## 🔒 **Security**

**AWS Lambda validates:**
- ✅ API key in Authorization header
- ✅ JSON payload format

**On-Premise Worker:**
- ✅ Only polls queue (outbound connection)
- ✅ No inbound firewall rules needed
- ✅ AWS credentials stored securely

---

## 🎯 **Alternative: Simple Tunnel (Quick Setup)**

If AWS setup is too complex, use **ngrok**:

```bash
# On your on-premise server:
ngrok http 5000

# Output:
Forwarding: https://abc123.ngrok.io → http://localhost:5000

# Give Colloki:
Webhook URL: https://abc123.ngrok.io/api/colloki/callback
```

**Pros:** 2-minute setup  
**Cons:** $8-20/month for stable URLs

---

**Last Updated:** November 19, 2025
