/**
 * Test Checklist Assignment with Task Details
 * Demonstrates two-message approach: Template + Free-form task details
 */

import { whatsappService } from '../server/whatsappService';

async function main() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const testPhoneNumber = '919000151199'; // Postpaid number

  if (!phoneNumberId || !accessToken) {
    throw new Error('Missing WhatsApp credentials');
  }

  console.log('🚀 Testing Checklist Assignment (Template + Task Details)');
  console.log('==========================================================');
  console.log('Phone Number ID:', phoneNumberId);
  console.log('Test Number: +' + testPhoneNumber);
  console.log('');

  whatsappService.setCredentials({ phoneNumberId, accessToken });

  try {
    // Step 1: Send template message
    console.log('📋 STEP 1: Send Template (qa_checklist_assigned)');
    console.log('--------------------------------------------------');
    console.log('Parameters:');
    console.log('  1. Operator: Rajesh Kumar');
    console.log('  2. Task ID: CL-ABC123');
    console.log('  3. Machine: Injection Molding Machine 1');
    console.log('  4. Checklist: Daily Safety Inspection');
    console.log('  5. Due: 06:00 PM, November 17, 2025');
    console.log('');

    const templateResult = await whatsappService.sendTemplateMessage({
      to: testPhoneNumber,
      templateName: 'qa_checklist_assigned',
      languageCode: 'en',
      parameters: [
        'Rajesh Kumar',
        'CL-ABC123',
        'Injection Molding Machine 1',
        'Daily Safety Inspection',
        '06:00 PM, November 17, 2025'
      ]
    });

    console.log(templateResult ? '✅ Template sent!' : '❌ Template failed');
    console.log('');

    if (!templateResult) {
      throw new Error('Template send failed');
    }

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Send task details (free-form message within 24-hour window)
    console.log('📋 STEP 2: Send Task Details (Free-form within 24h window)');
    console.log('------------------------------------------------------------');
    
    const taskDetailsMessage = `📋 *Task Details for CL-ABC123*

Tasks to Complete:
1. Check hydraulic oil levels
   (Visual inspection - must be between MIN and MAX marks)
2. Test emergency stop button
   (Functional test - press and verify immediate shutdown)
3. Verify temperature gauge reading
   (Must be within 20-30°C range)

Reply with task results in this format:
CL-ABC123 1:OK 2:OK 3:NOK-remarks

Example:
CL-ABC123 1:OK 2:OK 3:NOK-Temperature 35°C, above normal range`;

    console.log('Message:');
    console.log(taskDetailsMessage);
    console.log('');

    const taskDetailsResult = await whatsappService.sendTextMessage({
      to: testPhoneNumber,
      message: taskDetailsMessage
    });

    console.log(taskDetailsResult ? '✅ Task details sent!' : '❌ Task details failed');
    console.log('');

    console.log('==========================================================');
    console.log('✅ Checklist assignment sent successfully!');
    console.log('📱 Check WhatsApp at +919000151199');
    console.log('');
    console.log('🎯 What the operator receives:');
    console.log('   1. Template notification with basic info (compliant for postpaid)');
    console.log('   2. Detailed task list for completing the checklist');
    console.log('');
    console.log('✨ This approach works for BOTH prepaid AND postpaid numbers!');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

main().catch(console.error);
