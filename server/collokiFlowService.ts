/**
 * Colloki Flow AI Service
 * Integrates with collokiflow.micapps.com for intelligent response interpretation
 */

import axios from 'axios';

interface CollokiFlowRequest {
  output_type: 'chat';
  input_type: 'chat';
  input_value: string;
  session_id: string;
}

interface CollokiFlowResponse {
  outputs: Array<{
    outputs: Array<{
      results: {
        message: {
          text: string;
          data?: any;
        };
      };
    }>;
  }>;
  session_id: string;
}

interface InterpretedResponse {
  status: 'OK' | 'NOK' | 'UNCLEAR';
  remarks?: string | undefined;
  confidence: number;
  rawAiResponse: string;
}

export class CollokiFlowService {
  private apiUrl = 'https://collokiflow.micapps.com/api/v1/run/bab8b99c-4373-4138-878b-f8478c6c9d42';
  private apiKey: string;

  constructor() {
    const key = process.env.COLLOKI_FLOW_API_KEY;
    if (!key) {
      throw new Error('COLLOKI_FLOW_API_KEY not configured');
    }
    this.apiKey = key;
    console.log('✅ Colloki Flow AI service initialized');
  }

  /**
   * Interpret operator response using AI
   * Context includes checklist task details for better interpretation
   */
  async interpretResponse(params: {
    operatorMessage: string;
    taskName: string;
    verificationCriteria?: string;
    sessionId: string;
    context?: {
      machineName?: string;
      templateName?: string;
      operatorName?: string;
    };
  }): Promise<InterpretedResponse> {
    try {
      // Build context-aware prompt for AI
      let contextPrompt = `You are analyzing an operator's response for a checklist task in a manufacturing QA system.

Task: ${params.taskName}
${params.verificationCriteria ? `Criteria: ${params.verificationCriteria}` : ''}
${params.context?.machineName ? `Machine: ${params.context.machineName}` : ''}
${params.context?.templateName ? `Checklist: ${params.context.templateName}` : ''}

Operator's response: "${params.operatorMessage}"

Analyze this response and determine:
1. Is it OK (pass/good/complete) or NOK (fail/issue/problem)?
2. Extract any remarks or details about the issue
3. Rate your confidence (0-100%)

Respond in JSON format:
{
  "status": "OK" | "NOK" | "UNCLEAR",
  "remarks": "extracted remarks or null",
  "confidence": 0-100
}`;

      const requestData: CollokiFlowRequest = {
        output_type: 'chat',
        input_type: 'chat',
        input_value: contextPrompt,
        session_id: params.sessionId.replace(/^\+/, ''), // Remove + prefix for session_id
      };

      console.log('[COLLOKI FLOW] Sending interpretation request:', {
        taskName: params.taskName,
        messagePreview: params.operatorMessage.substring(0, 50),
        sessionId: params.sessionId,
      });

      const response = await axios.post<CollokiFlowResponse>(
        `${this.apiUrl}?stream=false`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
          timeout: 10000, // 10 second timeout
        }
      );

      const result = response.data;
      
      // Extract AI response text
      const aiText = result.outputs?.[0]?.outputs?.[0]?.results?.message?.text || '';
      
      console.log('[COLLOKI FLOW] AI Response:', aiText.substring(0, 200));

      // Parse AI response (try to extract JSON or analyze text)
      const interpreted = this.parseAiResponse(aiText, params.operatorMessage);

      return {
        ...interpreted,
        rawAiResponse: aiText,
      };

    } catch (error: any) {
      const errorMessage = error.response?.data || error.message || 'Unknown error';
      console.error('[COLLOKI FLOW ERROR]:', errorMessage);
      
      // Fallback to simple keyword-based interpretation
      const fallback = this.fallbackInterpretation(params.operatorMessage);
      return {
        ...fallback,
        rawAiResponse: 'Error: ' + errorMessage,
      };
    }
  }

  /**
   * Parse AI response to extract structured data
   */
  private parseAiResponse(aiText: string, originalMessage: string): Omit<InterpretedResponse, 'rawAiResponse'> {
    try {
      // Try to find JSON in the response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          status: parsed.status || 'UNCLEAR',
          remarks: parsed.remarks || undefined,
          confidence: parsed.confidence || 50,
        };
      }

      // Fallback: analyze AI text for keywords
      const lowerAi = aiText.toLowerCase();
      
      if (lowerAi.includes('ok') || lowerAi.includes('pass') || lowerAi.includes('complete')) {
        return {
          status: 'OK',
          remarks: undefined,
          confidence: 70,
        };
      }

      if (lowerAi.includes('nok') || lowerAi.includes('fail') || lowerAi.includes('issue') || lowerAi.includes('problem')) {
        // Try to extract remarks from AI analysis
        const remarksMatch = aiText.match(/remarks?[:\s]+"?([^"}\n]+)"?/i);
        return {
          status: 'NOK',
          remarks: remarksMatch?.[1] || originalMessage,
          confidence: 70,
        };
      }

      return {
        status: 'UNCLEAR',
        remarks: originalMessage,
        confidence: 30,
      };

    } catch (error) {
      console.error('[COLLOKI FLOW] Parse error:', error);
      return this.fallbackInterpretation(originalMessage);
    }
  }

  /**
   * Fallback interpretation using simple keyword matching
   */
  private fallbackInterpretation(message: string): Omit<InterpretedResponse, 'rawAiResponse'> {
    const lower = message.toLowerCase().trim();

    // Check for explicit OK
    if (lower === 'ok' || lower === 'okay' || lower.startsWith('ok ') || lower.startsWith('ok-')) {
      return {
        status: 'OK',
        remarks: undefined,
        confidence: 95,
      };
    }

    // Check for explicit NOK with remarks
    if (lower.startsWith('nok')) {
      const remarks = message.substring(3).trim().replace(/^[-:\s]+/, '');
      return {
        status: 'NOK',
        remarks: remarks || 'Issue reported',
        confidence: 95,
      };
    }

    // Check for positive keywords
    if (lower.includes('complete') || lower.includes('done') || lower.includes('good') || 
        lower.includes('pass') || lower === 'yes' || lower === 'y') {
      return {
        status: 'OK',
        remarks: undefined,
        confidence: 80,
      };
    }

    // Check for negative keywords
    if (lower.includes('fail') || lower.includes('issue') || lower.includes('problem') || 
        lower.includes('broken') || lower.includes('not') || lower === 'no' || lower === 'n') {
      return {
        status: 'NOK',
        remarks: message,
        confidence: 75,
      };
    }

    // Unclear - treat as NOK with remarks for safety
    return {
      status: 'NOK',
      remarks: message,
      confidence: 40,
    };
  }

  /**
   * Initialize a new conversation session with context
   */
  async initializeSession(params: {
    sessionId: string;
    checklistName: string;
    machineName: string;
    operatorName: string;
  }): Promise<void> {
    try {
      const contextMessage = `Starting quality checklist conversation:
- Checklist: ${params.checklistName}
- Machine: ${params.machineName}
- Operator: ${params.operatorName}

You will help interpret operator responses for various checklist tasks. Each response should be classified as OK (pass) or NOK (fail/issue), with any relevant remarks extracted.`;

      const requestData: CollokiFlowRequest = {
        output_type: 'chat',
        input_type: 'chat',
        input_value: contextMessage,
        session_id: params.sessionId.replace(/^\+/, ''), // Remove + prefix for session_id
      };

      await axios.post(
        `${this.apiUrl}?stream=false`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
          timeout: 60000, // 60 second timeout
        }
      );

      console.log('[COLLOKI FLOW] Session initialized:', params.sessionId);
    } catch (error) {
      console.error('[COLLOKI FLOW] Session init error:', error);
      // Non-critical - continue without AI context
    }
  }

  /**
   * Send WhatsApp message via Colloki Flow
   * Colloki Flow internally routes to Meta WhatsApp Graph API
   */
  async sendWhatsAppMessage(params: {
    message: string;
    sessionId: string;
    phoneNumber: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Get WhatsApp Phone Number ID from environment
      const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

      if (!whatsappPhoneId) {
        console.error('[COLLOKI FLOW] WhatsApp Phone Number ID not configured');
        return {
          success: false,
          error: 'WhatsApp Phone Number ID not configured',
        };
      }

      // Format input_value as: "text: <message>, from: <phone>, phoneNumberId: <id>"
      const inputValue = `text: ${params.message}, from: ${params.phoneNumber}, phoneNumberId: ${whatsappPhoneId}`;

      console.log('\n🔍 INPUT VALUE BREAKDOWN:');
      console.log('  Message:', params.message);
      console.log('  Phone:', params.phoneNumber);
      console.log('  PhoneNumberId:', whatsappPhoneId);
      console.log('  Final input_value:', inputValue);
      console.log('');

      const requestData: CollokiFlowRequest = {
        output_type: 'chat',
        input_type: 'chat',
        input_value: inputValue,
        session_id: params.phoneNumber.replace(/^\+/, ''), // Remove + prefix for session_id
      };

      const startTime = Date.now();
      
      // Print full request details
      console.log('\n========================================');
      console.log('[COLLOKI FLOW] REQUEST DETAILS');
      console.log('========================================');
      console.log('URL:', `${this.apiUrl}?stream=false`);
      console.log('Method: POST');
      console.log('Headers:', {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey.substring(0, 10) + '...',
      });
      console.log('Body:', JSON.stringify(requestData, null, 2));
      console.log('========================================\n');
      
      const response = await axios.post<CollokiFlowResponse>(
        `${this.apiUrl}?stream=false`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
          timeout: 60000, // 60 second timeout
        }
      );

      const responseTime = Date.now() - startTime;
      console.log(`[COLLOKI FLOW] Response received in ${responseTime}ms`);
      
      // Log the full response to understand what Colloki Flow returns
      console.log('[COLLOKI FLOW] Full response:', JSON.stringify(response.data, null, 2));
      
      // Extract any message from response
      const aiResponse = response.data.outputs?.[0]?.outputs?.[0]?.results?.message?.text;
      console.log('[COLLOKI FLOW] AI Response Text:', aiResponse);

      // Check if Colloki Flow returned an error
      if (aiResponse && aiResponse.toLowerCase().includes('error')) {
        console.error('[COLLOKI FLOW] ❌ Colloki Flow returned error:', aiResponse);
        return {
          success: false,
          error: aiResponse,
        };
      }

      console.log('[COLLOKI FLOW] ✅ WhatsApp message sent successfully via Colloki Flow');

      return { success: true };

    } catch (error: any) {
      const errorMessage = error.response?.data || error.message || 'Unknown error';
      console.error('[COLLOKI FLOW] WhatsApp send error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const collokiFlowService = new CollokiFlowService();
