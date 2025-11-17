/**
 * Test WhatsApp Integration - Free-form Message (24-hour window)
 * This works ONLY if the recipient has messaged you in the last 24 hours
 */

import 'dotenv/config';

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const RECIPIENT = '916305507336'; // Test number

async function sendFreeFormMessage(
  phoneNumber: string,
  message: string
): Promise<void> {
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  
  console.log(`📤 Sending WhatsApp message to +${phoneNumber}...\n`);
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phoneNumber,
    type: 'text',
    text: {
      preview_url: false,
      body: message
    }
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS! Message sent!\n');
      console.log('Message ID:', data.messages[0].id);
      console.log('Status:', data.messages[0].message_status);
      console.log('\n📱 Check WhatsApp on +916305507336');
      console.log('You should receive the test message!\n');
    } else {
      console.error('❌ FAILED to send message\n');
      console.error('Error Code:', data.error?.code);
      console.error('Error Message:', data.error?.message);
      console.error('Error Type:', data.error?.type);
      console.log('\n');
      
      // Common error handling
      if (data.error?.code === 131047) {
        console.log('💡 SOLUTION: This error means the 24-hour window is closed.');
        console.log('   From +916305507336, send a WhatsApp message to your business number first.');
        console.log('   Then run this script again within 24 hours.\n');
      } else if (data.error?.code === 131026) {
        console.log('💡 SOLUTION: Recipient number is not registered on WhatsApp.');
        console.log('   Make sure +916305507336 has WhatsApp installed.\n');
      } else if (data.error?.code === 100) {
        console.log('💡 SOLUTION: Invalid access token or permissions.');
        console.log('   Check WHATSAPP_ACCESS_TOKEN in your secrets.\n');
      }
      
      console.log('Full error details:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

async function main() {
  console.log('🚀 KINTO WhatsApp Integration Test\n');
  console.log('=' .repeat(60));
  console.log();
  
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.error('❌ ERROR: Missing WhatsApp credentials');
    console.log('Please ensure these environment variables are set:');
    console.log('- WHATSAPP_ACCESS_TOKEN');
    console.log('- WHATSAPP_PHONE_NUMBER_ID');
    process.exit(1);
  }
  
  console.log('📋 Configuration:');
  console.log('Phone Number ID:', PHONE_NUMBER_ID);
  console.log('Recipient:', `+${RECIPIENT}`);
  console.log();
  console.log('=' .repeat(60));
  console.log();
  
  // Test message
  const testMessage = `🎉 KINTO WhatsApp Integration Test

Hello! This is a test message from KINTO Smart Ops.

If you're receiving this, the WhatsApp integration is working correctly!

Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

- KINTO Operations Team`;
  
  await sendFreeFormMessage(RECIPIENT, testMessage);
  
  console.log('=' .repeat(60));
  console.log('\n✅ Test complete!');
  console.log('\nNext steps:');
  console.log('1. Check WhatsApp on +916305507336');
  console.log('2. Submit templates to Meta for production use');
  console.log('3. After templates are approved, full automation will work');
}

main().catch(console.error);
