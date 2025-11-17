/**
 * Submit WhatsApp Message Templates to Meta for Approval
 * Uses Meta Graph API to programmatically create templates
 */

import 'dotenv/config';

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

// Template definitions
const templates = [
  {
    name: 'machine_startup_reminder',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nThis is a reminder to start the machine before production begins:\n\nMachine: {{2}}\nScheduled Start Time: {{3}}\n\nPlease ensure the machine is properly warmed up and ready for production.\n\nReply with your status.\n\n- KINTO Operations Team',
        example: {
          body_text: [
            ['Rajesh Kumar', 'Injection Molding Machine 1', '08:00 AM, November 17, 2025']
          ]
        }
      }
    ]
  },
  {
    name: 'missed_checklist_alert',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'KINTO Missed Checklist Alert\n\nOperator {{1}} has not completed the following checklist:\n\nMachine: {{2}}\nChecklist: {{3}}\nDue Time: {{4}}\n\nPlease take immediate action.\n\n- KINTO QA System',
        example: {
          body_text: [
            ['Rajesh Kumar', 'Injection Molding Machine 1', 'Daily QA Checklist', '08:00 AM, November 17, 2025']
          ]
        }
      }
    ]
  },
  {
    name: 'qa_checklist_assigned',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nNew QA Checklist Assigned:\n\nTask ID: {{2}}\nMachine: {{3}}\nChecklist: {{4}}\nDue: {{5}}\n\nPlease complete this checklist on time.\n\nReply with your status or questions.\n\n- KINTO QA Team',
        example: {
          body_text: [
            ['Rajesh Kumar', 'MST-A1B2C3', 'Injection Molding Machine 1', 'Daily QA Checklist', '08:00 AM, November 17, 2025']
          ]
        }
      }
    ]
  },
  {
    name: 'production_alert',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Production Alert\n\n{{1}}\n\nProduct: {{2}}\nShift: {{3}}\nAction Required: {{4}}\n\nContact supervisor if you need assistance.\n\n- KINTO Operations',
        example: {
          body_text: [
            ['Material Shortage', 'Steel Rod 10mm', 'Shift A', 'Request additional material from warehouse']
          ]
        }
      }
    ]
  }
];

async function getWABAId(): Promise<string | null> {
  console.log('🔍 Finding WhatsApp Business Account ID...\n');
  
  try {
    // Try to get WABA ID from Phone Number ID
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}?fields=id,verified_name,code_verification_status,quality_rating,whatsapp_business_account_id`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });
    
    const data = await response.json();
    
    if (data.whatsapp_business_account_id) {
      console.log('✅ Found WABA ID:', data.whatsapp_business_account_id);
      console.log('📞 Phone Number:', data.verified_name);
      console.log('⭐ Quality Rating:', data.quality_rating || 'N/A');
      console.log();
      return data.whatsapp_business_account_id;
    } else {
      console.error('❌ Could not find WABA ID from phone number');
      console.log('Response:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting WABA ID:', error);
    return null;
  }
}

async function submitTemplate(wabaId: string, template: any): Promise<boolean> {
  const url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates`;
  
  console.log(`📤 Submitting template: ${template.name}...`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(template)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ SUCCESS: Template "${template.name}" submitted!`);
      console.log(`   Template ID: ${data.id}`);
      console.log(`   Status: ${data.status || 'PENDING REVIEW'}\n`);
      return true;
    } else {
      console.error(`❌ FAILED: Template "${template.name}" submission failed`);
      console.error(`   Error Code: ${data.error?.code}`);
      console.error(`   Message: ${data.error?.message}`);
      console.error(`   Type: ${data.error?.type}\n`);
      
      // Check for common errors
      if (data.error?.code === 100) {
        console.log('💡 Suggestion: Check WABA ID and access token permissions\n');
      } else if (data.error?.error_user_title) {
        console.log(`💡 ${data.error.error_user_title}: ${data.error.error_user_msg}\n`);
      }
      
      return false;
    }
  } catch (error) {
    console.error(`❌ Network error submitting "${template.name}":`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 WhatsApp Message Template Submission Tool\n');
  console.log('=' .repeat(60));
  console.log();
  
  // Verify credentials
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.error('❌ ERROR: Missing WhatsApp credentials');
    console.log('Please ensure these environment variables are set:');
    console.log('- WHATSAPP_ACCESS_TOKEN');
    console.log('- WHATSAPP_PHONE_NUMBER_ID');
    process.exit(1);
  }
  
  // Get WABA ID
  const wabaId = await getWABAId();
  
  if (!wabaId) {
    console.error('\n❌ Cannot proceed without WABA ID');
    console.log('\n📋 Manual Submission Required:');
    console.log('Please visit: https://business.facebook.com/wa/manage/message-templates/');
    console.log('And manually create the templates from: docs/deployment/WhatsApp_Message_Templates.md');
    process.exit(1);
  }
  
  console.log('📝 Submitting 4 templates to Meta for approval...\n');
  console.log('=' .repeat(60));
  console.log();
  
  let successCount = 0;
  let failCount = 0;
  
  // Submit all templates
  for (const template of templates) {
    const success = await submitTemplate(wabaId, template);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay between submissions
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('=' .repeat(60));
  console.log('\n📊 SUBMISSION SUMMARY\n');
  console.log(`✅ Successfully submitted: ${successCount} templates`);
  console.log(`❌ Failed submissions: ${failCount} templates`);
  console.log();
  
  if (successCount > 0) {
    console.log('⏳ Templates are now under Meta review (1-48 hours)');
    console.log('📧 You will be notified via email when approved/rejected');
    console.log();
    console.log('📋 Check status at:');
    console.log('   https://business.facebook.com/wa/manage/message-templates/');
    console.log();
    console.log('🎉 Once approved, you can send messages to ANY number!');
  }
  
  if (failCount > 0) {
    console.log('\n⚠️  Some templates failed. Check errors above.');
    console.log('You may need to submit them manually.');
  }
}

main().catch(console.error);
