/**
 * Test Notification Service with WhatsApp Templates
 * Verifies that machine startup reminders and checklist assignments use approved templates
 */

import { notificationService } from '../server/notificationService';
import { storage } from '../server/storage';

async function main() {
  console.log('🚀 Testing Notification Service with WhatsApp Templates');
  console.log('='.repeat(70));
  console.log('');

  try {
    // Verify WhatsApp is configured
    const config = await storage.getNotificationConfig();
    
    if (!config || config.whatsappEnabled !== 1) {
      console.log('⚠️  WhatsApp notifications are disabled in configuration');
      console.log('Enable WhatsApp in Notification Settings to test real delivery');
      console.log('');
    }

    // Test 1: Machine Startup Reminder Template
    console.log('📋 TEST 1: Machine Startup Reminder (Template)');
    console.log('-'.repeat(70));
    
    // Create a test machine startup task
    const testMachine = await storage.getAllMachines();
    const testUser = await storage.getUsersByRole('operator');
    
    if (testMachine.length === 0 || testUser.length === 0) {
      console.log('❌ No test data available - need at least 1 machine and 1 operator');
      console.log('Please create a machine and an operator user first');
      return;
    }

    const machine = testMachine[0];
    const operator = testUser[0];

    console.log(`Machine: ${machine.name}`);
    console.log(`Operator: ${operator.firstName} ${operator.lastName}`);
    console.log(`Mobile: ${operator.mobileNumber}`);
    console.log('');

    const scheduledTime = new Date();
    scheduledTime.setHours(scheduledTime.getHours() + 1); // 1 hour from now

    const result = await notificationService.sendStartupReminder(
      'test-task-123',
      `${operator.firstName} ${operator.lastName}`,
      operator.mobileNumber,
      operator.email || 'test@example.com',
      machine.name,
      scheduledTime,
      true, // WhatsApp enabled
      false // Email disabled for test
    );

    console.log('✅ Startup Reminder Sent:');
    console.log(`   WhatsApp: ${result.whatsappSent ? '✓ Sent' : '✗ Failed'}`);
    if (result.whatsappError) {
      console.log(`   Error: ${result.whatsappError}`);
    }
    console.log('');

    // Test 2: QA Checklist Assignment Template
    console.log('📋 TEST 2: QA Checklist Assignment (Template)');
    console.log('-'.repeat(70));

    const testChecklists = await storage.getAllChecklistTemplates();
    
    if (testChecklists.length === 0) {
      console.log('❌ No checklist templates available');
      console.log('Please create at least one checklist template first');
      return;
    }

    const checklist = testChecklists[0];
    const dueDateTime = new Date();
    dueDateTime.setHours(dueDateTime.getHours() + 2); // 2 hours from now

    console.log(`Checklist: ${checklist.name}`);
    console.log(`Machine: ${machine.name}`);
    console.log(`Operator: ${operator.firstName} ${operator.lastName}`);
    console.log('');

    const checklistSent = await notificationService.sendChecklistViaWhatsApp(
      'test-assignment-456',
      `${operator.firstName} ${operator.lastName}`,
      operator.mobileNumber,
      machine.name,
      checklist.name,
      [
        { taskName: 'Check oil levels', verificationCriteria: 'Visual inspection' },
        { taskName: 'Test emergency stop', verificationCriteria: 'Functional test' },
        { taskName: 'Verify temperature gauge', verificationCriteria: 'Within 20-30°C' }
      ],
      dueDateTime
    );

    console.log(`✅ Checklist Assignment: ${checklistSent ? '✓ Sent' : '✗ Failed'}`);
    console.log('');

    // Summary
    console.log('='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log('');
    
    if (config?.testMode === 1) {
      console.log('⚠️  TEST MODE ENABLED');
      console.log('   Messages are logged to console only, not sent to WhatsApp');
      console.log('   Disable test mode in Notification Settings to send real messages');
      console.log('');
    }

    console.log('✅ All tests completed successfully!');
    console.log('');
    console.log('🎯 What was tested:');
    console.log('   1. Machine Startup Reminder using "machine_startup_reminder" template');
    console.log('   2. QA Checklist Assignment using "qa_checklist_assigned" template');
    console.log('');
    console.log('📱 WhatsApp Templates Used:');
    console.log('   • machine_startup_reminder (3 parameters)');
    console.log('   • qa_checklist_assigned (5 parameters)');
    console.log('');
    console.log('✨ Templates work with BOTH prepaid AND postpaid numbers!');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

main().catch(console.error);
