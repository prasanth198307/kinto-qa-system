# Colloki Flow AI Integration for WhatsApp Conversations

## Overview
The KINTO WhatsApp conversation system now integrates with Colloki Flow AI (collokiflow.micapps.com) for:
1. **Intelligent Response Interpretation**: AI-powered understanding of operator checklist responses
2. **Dual-Channel WhatsApp Messaging**: Colloki Flow as primary channel with Meta Graph API as fallback

## Integration Date
**November 19, 2025**

## Purpose
The AI integration provides:

### Response Interpretation
1. **Intelligent OK/NOK Detection**: Understands natural language responses beyond simple keyword matching
2. **Remark Extraction**: Automatically extracts meaningful remarks from operator messages
3. **Context Awareness**: Maintains conversation context including checklist, machine, and operator information
4. **Confidence-Based Decision Making**: Uses AI confidence scores to determine when to use AI vs. keyword fallback

### Dual-Channel Messaging
1. **Colloki Flow as Primary**: All conversation messages sent via Colloki Flow first
2. **Meta Graph API as Fallback**: Automatic fallback if Colloki Flow fails
3. **Session Context Preservation**: Maintains conversation continuity across channels
4. **Transparent Routing**: Operators don't notice which channel is used

## Architecture

### Components
1. **CollokiFlowService** (`server/collokiFlowService.ts`)
   - Interfaces with Colloki Flow API
   - Handles request/response formatting
   - Implements fallback logic
   - Manages AI session initialization

2. **WhatsAppConversationService** (updated)
   - Integrates AI interpretation into message handling
   - Implements 3-tier interpretation strategy
   - Manages confidence thresholds and safety gates

3. **Database Schema** (updated)
   - Added `ai_session_id` column to `whatsapp_conversation_sessions` table
   - Stores AI session context for conversation continuity

### API Configuration
- **Endpoint**: `https://collokiflow.micapps.com/api/v1/run/bab8b99c-4373-4138-878b-f8478c6c9d42`
- **Authentication**: Bearer token via `COLLOKI_FLOW_API_KEY` environment variable
- **Request Format**: JSON with `output_type`, `input_type`, `input_value`, `session_id`
- **Response Format**: Nested JSON structure with AI message text

## 3-Tier Interpretation Strategy

### Tier 1: AI Interpretation (Primary)
- **Condition**: AI confidence >= 70% AND status !== 'UNCLEAR'
- **Action**: Use AI-detected status (OK/NOK) and extracted remarks
- **Advantages**: Understands natural language, context-aware, intelligent remark extraction

### Tier 2: Keyword Fallback (Secondary)
- **Condition**: AI confidence < 70% OR status === 'UNCLEAR' OR AI error
- **Action**: Use deterministic keyword matching (OK, NOK, etc.)
- **Logic**:
  - Exact match: "OK", "okay", starts with "OK "
  - NOK match: starts with "NOK" (extract remarks after "NOK")
  - Positive keywords: "complete", "done", "good", "pass", "yes"
  - Negative keywords: "fail", "issue", "problem", "broken", "not", "no"

### Tier 3: Clarification Request (Final)
- **Condition**: Both AI and keyword fallback fail to determine status
- **Action**: Send clarification message to operator
- **Result**: DO NOT advance checklist - wait for valid response

## Safety Mechanisms

### Confidence Gating
```typescript
// Only use AI if confident and not unclear
if (interpretation.confidence >= 70 && interpretation.status !== 'UNCLEAR') {
  // Use AI result
} else {
  // Fall back to keywords
}
```

### UNCLEAR Status Handling
- Status `'UNCLEAR'` is treated as invalid
- System falls back to keyword parsing
- If keywords also fail, asks operator to clarify
- Checklist does NOT advance on unclear responses

### Final Safety Check
```typescript
// Before saving answer
if (result === null) {
  // Ask for clarification
  return; // DO NOT call saveAnswerAndProgress
}
```

## Response Format

### InterpretedResponse Interface
```typescript
interface InterpretedResponse {
  status: 'OK' | 'NOK' | 'UNCLEAR';
  remarks?: string;
  confidence: number; // 0-100
  rawAiResponse: string;
}
```

### Confidence Levels
- **95%**: Exact keyword match (OK, NOK)
- **80%**: Strong keyword indicators
- **75%**: Moderate keyword indicators
- **70%**: Minimum threshold for AI acceptance
- **40-50%**: Low confidence (triggers fallback)
- **30%**: Very uncertain (UNCLEAR status)

## Context Management

### Session Initialization
When a conversation starts, the AI receives context:
```typescript
await collokiFlowService.initializeSession({
  sessionId: session.id,
  checklistName: 'Quality Checklist XYZ',
  machineName: 'CNC Machine 01',
  operatorName: 'John Doe',
});
```

### Per-Message Context
Each operator response is interpreted with:
- Task name and verification criteria
- Machine name
- Checklist template name
- Operator name
- Full conversation history (via session_id)

## Dual-Channel Messaging System

### Architecture
The system uses a **Colloki Flow primary + Meta fallback** strategy for sending WhatsApp messages:

```
┌─────────────────────────────────────────┐
│  WhatsApp Conversation Service         │
│  (All outgoing messages)                │
└──────────────┬──────────────────────────┘
               │ sessionId provided?
               ├─ YES → Primary Channel
               │  ┌──────────────────────────┐
               │  │  Colloki Flow API        │
               │  │  (Try First)             │
               │  └──────┬───────────────────┘
               │         │ Success?
               │         ├─ YES → ✅ Done
               │         └─ NO  → Fallback ↓
               │
               ↓ NO or Fallback
        ┌──────────────────────────┐
        │  Meta WhatsApp Graph API │
        │  (Direct)                │
        └──────────────────────────┘
```

### Message Routing Logic

**When sessionId is provided:**
```typescript
// Primary: Try Colloki Flow first
const collokiResult = await collokiFlowService.sendWhatsAppMessage({
  message: 'Your message',
  sessionId: session.id,
});

if (collokiResult.success) {
  // ✅ Success via Colloki Flow
  return true;
} else {
  // ⚠️ Fallback to Meta Graph API
  await metaGraphApi.sendMessage(...);
}
```

**When no sessionId (legacy or no active session):**
```typescript
// Use Meta Graph API directly
await metaGraphApi.sendMessage(...);
```

### Colloki Flow Message Format
```json
{
  "output_type": "chat",
  "input_type": "chat",
  "input_value": "📋 Question 1 of 5: Check oil level...",
  "session_id": "d1d6f706-fcd3-434b-93aa-56d5ee2a1316"
}
```

**Note**: Colloki Flow internally routes to Meta WhatsApp Graph API, so operators receive messages from the same WhatsApp Business number regardless of which channel is used.

### Session Context Preservation
All conversation messages maintain session context:
- ✅ Initial question
- ✅ Photo acknowledgments
- ✅ Clarification requests
- ✅ Progress updates
- ✅ Confirmation summary
- ✅ Submission/cancellation messages
- ✅ Reminders
- ✅ Session expiry notices

### Logging
```
[WHATSAPP] Trying Colloki Flow as primary channel...
[COLLOKI FLOW] Sending WhatsApp message via Colloki Flow: {...}
[COLLOKI FLOW] WhatsApp message sent successfully via Colloki Flow
[WHATSAPP] ✅ Message sent via Colloki Flow (primary)

# Or on fallback:
[WHATSAPP] ⚠️ Colloki Flow failed, falling back to Meta Graph API: Error...
[WHATSAPP] Using Meta Graph API (fallback)
[WHATSAPP] ✅ Message sent via Meta Graph API: wamid.xyz...
```

## Message Flow Examples

### Example 1: High-Confidence AI (Photo + Caption)
```
Operator: NOK - oil leak detected at bottom seal
AI Interpretation:
  status: 'NOK'
  confidence: 95
  remarks: 'oil leak detected at bottom seal'
Result: ✅ AI result used (confident & clear)
```

### Example 2: Low-Confidence AI (Ambiguous Text)
```
Operator: maybe issue with pressure
AI Interpretation:
  status: 'NOK'
  confidence: 55
  remarks: 'maybe issue with pressure'
Result: ⚠️ Low confidence - checking keywords
Keyword Check: No explicit OK/NOK found
Result: ❌ Ask for clarification (checklist does NOT advance)
```

### Example 3: UNCLEAR Status
```
Operator: hmm
AI Interpretation:
  status: 'UNCLEAR'
  confidence: 20
Result: ⚠️ UNCLEAR - checking keywords
Keyword Check: No OK/NOK found
Result: ❌ Ask operator: "Please reply with OK or NOK - describe problem"
```

### Example 4: AI Error with Fallback
```
Operator: OK
AI: [Network Error]
Result: ⚠️ AI failed - using keyword fallback
Keyword Match: "OK" (exact match)
Result: ✅ Use keyword result (confidence 95)
```

## Error Handling

### AI Service Errors
- Network failures
- API timeouts
- Invalid responses
- **Action**: Log error, use keyword fallback

### Response Parsing Errors
- JSON parse failures
- Missing fields
- **Action**: Analyze AI text for keywords, use fallback

### Database Errors
- Session not found
- Context fetch failures
- **Action**: Continue without AI context (graceful degradation)

## Environment Variables
```bash
COLLOKI_FLOW_API_KEY=<your-api-key>
```

## Database Migration
```sql
-- Add AI session ID column
ALTER TABLE whatsapp_conversation_sessions
ADD COLUMN IF NOT EXISTS ai_session_id VARCHAR(255);
```

## Monitoring & Analytics

### Key Metrics to Track
1. **AI Usage Rate**: % of responses interpreted by AI vs. keyword fallback
2. **Confidence Distribution**: Average confidence scores
3. **UNCLEAR Rate**: % of responses marked as unclear
4. **Fallback Rate**: % of responses requiring keyword fallback
5. **Clarification Rate**: % of responses requiring operator clarification

### Logging
```
[COLLOKI FLOW] Sending interpretation request
[COLLOKI FLOW] AI Response: {...}
[WHATSAPP AI] Photo+caption interpretation: {status, confidence, remarks}
[WHATSAPP AI] Low confidence or UNCLEAR, using keyword fallback
```

## Testing Recommendations

### Test Scenarios
1. **High-Confidence AI Path**
   - Send clear OK/NOK messages
   - Verify AI interpretation is used
   - Confirm confidence >= 70%

2. **Low-Confidence Path**
   - Send ambiguous messages
   - Verify keyword fallback activates
   - Confirm checklist doesn't advance on unclear responses

3. **UNCLEAR Status Path**
   - Send completely unclear messages ("hmm", "...", "?")
   - Verify clarification is requested
   - Confirm checklist doesn't advance

4. **Error Handling Path**
   - Simulate AI service down
   - Verify keyword fallback works
   - Confirm no checklist advancement on ambiguity

5. **Context Persistence**
   - Multiple messages in same session
   - Verify AI remembers conversation context
   - Confirm session_id is maintained

## Performance Considerations

### Response Time
- AI interpretation adds ~500-1500ms latency
- Keyword fallback is instant (<1ms)
- Timeout: 30 seconds for AI API

### Throughput
- AI service handles concurrent requests
- No impact on database locking (<3ms)
- Session initialization is non-blocking

## Future Enhancements

### Potential Improvements
1. **Adaptive Confidence Thresholds**
   - Adjust threshold based on task complexity
   - Learn from operator patterns

2. **Multi-Language Support**
   - Extend AI to understand regional languages
   - Support Telugu, Hindi operator responses

3. **Photo Analysis**
   - AI-powered image defect detection
   - Automatic NOK classification from photos

4. **Analytics Dashboard**
   - Real-time AI performance metrics
   - Operator messaging pattern analysis

5. **Fine-Tuning**
   - Train AI on historical checklist data
   - Improve manufacturing domain understanding

## Security & Privacy

### Data Protection
- API key stored securely in environment variables
- Operator messages sent to Colloki Flow API
- No sensitive data (passwords, personal info) in messages
- Session IDs are UUIDs (not predictable)

### API Security
- HTTPS encryption for all API calls
- Bearer token authentication
- Rate limiting on API endpoint

## Troubleshooting

### Common Issues

**Issue**: AI always returns UNCLEAR
- **Cause**: Prompt may be too complex or context missing
- **Solution**: Check session initialization, simplify prompts

**Issue**: High fallback rate
- **Cause**: AI confidence threshold too high
- **Solution**: Monitor logs, consider adjusting 70% threshold

**Issue**: Operators confused by clarification requests
- **Cause**: Messages not clear enough
- **Solution**: Improve clarification message wording

**Issue**: AI service timeout
- **Cause**: Network issues or API overload
- **Solution**: Increase timeout, check API status

## Contact & Support
- **API Issues**: Contact Colloki Flow support
- **Integration Issues**: Check logs at `/tmp/logs/Start_application_*.log`
- **Database Issues**: Review `whatsapp_conversation_sessions` table

---

**Last Updated**: November 19, 2025
**Version**: 1.0
**Status**: Production-Ready ✅
