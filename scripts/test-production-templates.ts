/**
 * Test WhatsApp Templates in Production Mode (Bypass Test Mode)
 * Sends real template messages to postpaid number +919000151199
 */

import { whatsappService } from '../server/whatsappService';

async function main() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const testPhoneNumber = '919000151199'; // Postpaid number (already formatted)

  if (!phoneNumberId || !accessToken) {
    throw new Error('Missing WhatsApp credentials in environment variables');
  }

  console.log('🚀 Testing Production WhatsApp Templates');
  console.log('==========================================');
  console.log('Phone Number ID:', phoneNumberId);
  console.log('Test Number: +' + testPhoneNumber);
  console.log('');

  // Set credentials
  whatsappService.setCredentials({
    phoneNumberId,
    accessToken
  });

  try {
    // Test 1: Machine Startup Reminder Template
    console.log('📋 TEST 1: Machine Startup Reminder Template');
    console.log('---------------------------------------------');
    console.log('Template: machine_startup_reminder');
    console.log('Parameters:');
    console.log('  1. Operator Name: Rajesh Kumar');
    console.log('  2. Machine: Injection Molding Machine 1');
    console.log('  3. Scheduled Time: 08:00 AM, November 17, 2025');
    console.log('');

    const result1 = await whatsappService.sendTemplateMessage({
      to: testPhoneNumber,
      templateName: 'machine_startup_reminder',
      languageCode: 'en',
      parameters: [
        'Rajesh Kumar',
        'Injection Molding Machine 1',
        '08:00 AM, November 17, 2025'
      ]
    });

    console.log(result1 ? '✅ Sent successfully!' : '❌ Failed to send');
    console.log('');

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: QA Checklist Assignment Template
    console.log('📋 TEST 2: QA Checklist Assignment Template');
    console.log('--------------------------------------------');
    console.log('Template: qa_checklist_assigned');
    console.log('Parameters:');
    console.log('  1. Operator Name: Rajesh Kumar');
    console.log('  2. Task ID: CL-TEST123');
    console.log('  3. Machine: Injection Molding Machine 1');
    console.log('  4. Checklist: Daily Safety Checklist');
    console.log('  5. Due: 06:00 PM, November 17, 2025');
    console.log('');

    const result2 = await whatsappService.sendTemplateMessage({
      to: testPhoneNumber,
      templateName: 'qa_checklist_assigned',
      languageCode: 'en',
      parameters: [
        'Rajesh Kumar',
        'CL-TEST123',
        'Injection Molding Machine 1',
        'Daily Safety Checklist',
        '06:00 PM, November 17, 2025'
      ]
    });

    console.log(result2 ? '✅ Sent successfully!' : '❌ Failed to send');
    console.log('');

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Missed Checklist Alert Template
    console.log('📋 TEST 3: Missed Checklist Alert Template');
    console.log('------------------------------------------');
    console.log('Template: missed_checklist_alert');
    console.log('Parameters:');
    console.log('  1. Operator Name: Rajesh Kumar');
    console.log('  2. Machine: Injection Molding Machine 1');
    console.log('  3. Checklist: Morning Inspection');
    console.log('  4. Due Time: 09:00 AM, November 17, 2025');
    console.log('');

    const result3 = await whatsappService.sendTemplateMessage({
      to: testPhoneNumber,
      templateName: 'missed_checklist_alert',
      languageCode: 'en',
      parameters: [
        'Rajesh Kumar',
        'Injection Molding Machine 1',
        'Morning Inspection',
        '09:00 AM, November 17, 2025'
      ]
    });

    console.log(result3 ? '✅ Sent successfully!' : '❌ Failed to send');
    console.log('');

    console.log('==========================================');
    console.log('✅ All production template tests completed!');
    console.log('📱 Check WhatsApp at +919000151199');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

main().catch(console.error);
