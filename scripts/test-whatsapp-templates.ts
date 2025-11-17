/**
 * Test WhatsApp Message Templates
 * Tests approved templates with postpaid number +919000151199
 */

interface TemplateParameter {
  type: 'text';
  text: string;
}

interface TemplateComponent {
  type: 'body';
  parameters: TemplateParameter[];
}

interface TemplateMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components: TemplateComponent[];
  };
}

async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  parameters: string[]
): Promise<void> {
  const message: TemplateMessage = {
    messaging_product: 'whatsapp',
    to: to.replace(/[^0-9]/g, ''), // Remove formatting
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: 'en', // English language
      },
      components: [
        {
          type: 'body',
          parameters: parameters.map(text => ({
            type: 'text',
            text,
          })),
        },
      ],
    },
  };

  console.log('\n📤 Sending WhatsApp template message...');
  console.log('Template:', templateName);
  console.log('To:', to);
  console.log('Parameters:', parameters);

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Error:', JSON.stringify(data, null, 2));
    throw new Error(`WhatsApp API error: ${data.error?.message || 'Unknown error'}`);
  }

  console.log('✅ Message sent successfully!');
  console.log('Message ID:', data.messages?.[0]?.id);
  console.log('Response:', JSON.stringify(data, null, 2));
}

async function main() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const testPhoneNumber = '+919000151199'; // Postpaid number

  if (!phoneNumberId || !accessToken) {
    throw new Error('Missing WhatsApp credentials in environment variables');
  }

  console.log('🚀 Testing WhatsApp Templates with Postpaid Number');
  console.log('================================================');
  console.log('Phone Number ID:', phoneNumberId);
  console.log('Test Number:', testPhoneNumber);
  console.log('');

  try {
    // Test 1: Machine Startup Reminder
    console.log('\n📋 Test 1: Machine Startup Reminder');
    console.log('====================================');
    await sendTemplateMessage(
      phoneNumberId,
      accessToken,
      testPhoneNumber,
      'machine_startup_reminder',
      [
        'Rajesh Kumar', // {{1}} - Operator name
        'Injection Molding Machine 1', // {{2}} - Machine name
        '08:00 AM, November 17, 2025', // {{3}} - Scheduled start time
      ]
    );

    // Wait 2 seconds between messages
    console.log('\n⏳ Waiting 2 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: QA Checklist Assignment
    console.log('\n📋 Test 2: QA Checklist Assignment');
    console.log('====================================');
    await sendTemplateMessage(
      phoneNumberId,
      accessToken,
      testPhoneNumber,
      'qa_checklist_assigned',
      [
        'Rajesh Kumar', // {{1}} - Operator name
        'MST-A1B2C3', // {{2}} - Task ID
        'Injection Molding Machine 1', // {{3}} - Machine name
        'Daily QA Checklist', // {{4}} - Checklist name
        '08:00 AM, November 17, 2025', // {{5}} - Due time
      ]
    );

    console.log('\n✅ All tests completed successfully!');
    console.log('📱 Check your WhatsApp at +919000151199');
    console.log('');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

main().catch(console.error);
