/**
 * WhatsApp Test Script
 * Sends a test message to verify Meta WhatsApp Business API integration
 */

import 'dotenv/config';

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const TEST_RECIPIENT = '919000151199'; // Your test number

async function sendTestWhatsAppMessage() {
  console.log('🚀 Testing WhatsApp Integration...\n');
  
  // Verify credentials are loaded
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('❌ ERROR: WhatsApp credentials not found in environment variables');
    console.log('Please ensure the following are set:');
    console.log('- WHATSAPP_PHONE_NUMBER_ID');
    console.log('- WHATSAPP_ACCESS_TOKEN');
    process.exit(1);
  }
  
  console.log('✅ Phone Number ID:', PHONE_NUMBER_ID);
  console.log('✅ Access Token:', ACCESS_TOKEN.substring(0, 20) + '...');
  console.log('📱 Sending to:', '+' + TEST_RECIPIENT);
  console.log();
  
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  
  const testMessage = {
    messaging_product: 'whatsapp',
    to: TEST_RECIPIENT,
    type: 'text',
    text: {
      preview_url: false,
      body: `🎉 KINTO Smart Ops - WhatsApp Test Message

Hello! This is a test message from your KINTO Operations & QA Management System.

✅ WhatsApp integration is working correctly!

Your system is now ready to send:
• Machine Startup Reminders
• Missed Checklist Notifications
• Production Alerts

Timestamp: ${new Date().toLocaleString('en-IN', { 
  timeZone: 'Asia/Kolkata',
  dateStyle: 'full',
  timeStyle: 'long'
})}

- KINTO Team`
    }
  };
  
  try {
    console.log('📤 Sending message to Meta WhatsApp Cloud API...\n');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });
    
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS! WhatsApp message sent successfully!\n');
      console.log('📋 Response Details:');
      console.log(JSON.stringify(responseData, null, 2));
      console.log('\n📱 Check your WhatsApp at +919000151199 for the test message!');
      console.log('\n🎉 WhatsApp integration is working perfectly!');
    } else {
      console.error('❌ ERROR: Failed to send WhatsApp message\n');
      console.error('HTTP Status:', response.status, response.statusText);
      console.error('Response:', JSON.stringify(responseData, null, 2));
      
      // Common error explanations
      if (responseData.error) {
        console.error('\n🔍 Error Details:');
        console.error('Code:', responseData.error.code);
        console.error('Message:', responseData.error.message);
        
        if (responseData.error.code === 190) {
          console.error('\n💡 Suggestion: Your access token may be expired or invalid. Please regenerate it from Meta Business Suite.');
        } else if (responseData.error.code === 100) {
          console.error('\n💡 Suggestion: Check that the Phone Number ID is correct and the number is registered in Meta Business Suite.');
        }
      }
    }
  } catch (error) {
    console.error('❌ NETWORK ERROR:', error);
    console.error('\n💡 Please check your internet connection and Meta API credentials.');
  }
}

// Run the test
sendTestWhatsAppMessage().catch(console.error);
