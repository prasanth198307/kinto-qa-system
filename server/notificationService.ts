/**
 * Notification Service for Machine Startup Reminders
 * 
 * Supports both console logging (test mode) and real notification sending:
 * - SendGrid for Email
 * - Meta WhatsApp Cloud API for WhatsApp
 * 
 * Configuration stored in database, sensitive credentials in environment variables.
 */

import { storage } from './storage';
import { whatsappService } from './whatsappService';

export interface NotificationResult {
  whatsappSent: boolean;
  emailSent: boolean;
  whatsappError?: string;
  emailError?: string;
}

export class NotificationService {
  /**
   * Generate unique task reference ID (e.g., MST-A1B2C3 or CL-A1B2C3)
   */
  private generateTaskReference(prefix: string = 'MST'): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ref = `${prefix}-`;
    for (let i = 0; i < 6; i++) {
      ref += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ref;
  }

  /**
   * Send machine startup reminder notification
   */
  async sendStartupReminder(
    taskId: string,
    userName: string,
    userMobile: string,
    userEmail: string,
    machineName: string,
    scheduledTime: Date,
    whatsappEnabled: boolean,
    emailEnabled: boolean
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      whatsappSent: false,
      emailSent: false
    };

    // Generate unique task reference ID for this reminder
    const taskReferenceId = this.generateTaskReference();
    
    // Update task with reference ID
    await storage.updateMachineStartupTask(taskId, { taskReferenceId });

    // Fetch notification configuration from database
    const config = await storage.getNotificationConfig();

    // Send WhatsApp notification if enabled
    if (whatsappEnabled && config?.whatsappEnabled === 1) {
      try {
        await this.sendWhatsAppMessage(
          userMobile,
          userName,
          machineName,
          scheduledTime,
          taskReferenceId,
          config
        );
        result.whatsappSent = true;
      } catch (error) {
        result.whatsappError = error instanceof Error ? error.message : 'WhatsApp send failed';
        console.error(`[NOTIFICATION ERROR] WhatsApp failed for ${userName}:`, result.whatsappError);
      }
    }

    // Send Email notification if enabled
    if (emailEnabled && config?.emailEnabled === 1) {
      try {
        await this.sendEmailMessage(
          userEmail,
          userName,
          machineName,
          scheduledTime,
          config
        );
        result.emailSent = true;
      } catch (error) {
        result.emailError = error instanceof Error ? error.message : 'Email send failed';
        console.error(`[NOTIFICATION ERROR] Email failed for ${userName}:`, result.emailError);
      }
    }

    return result;
  }

  /**
   * Send WhatsApp message via Meta Cloud API (or console in test mode)
   */
  private async sendWhatsAppMessage(
    mobile: string,
    userName: string,
    machineName: string,
    scheduledTime: Date,
    taskReferenceId: string,
    config: any
  ): Promise<void> {
    const formattedTime = scheduledTime.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    });

    // Set WhatsApp credentials dynamically (database takes precedence over env vars)
    if (config.metaPhoneNumberId && config.metaAccessToken) {
      whatsappService.setCredentials({
        phoneNumberId: config.metaPhoneNumberId,
        accessToken: config.metaAccessToken
      });
    } else if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
      whatsappService.setCredentials({
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN
      });
    }

    // Test mode - log to console
    if (config.testMode === 1) {
      console.log('\n' + '='.repeat(60));
      console.log('[WHATSAPP NOTIFICATION - TEST MODE]');
      console.log('='.repeat(60));
      console.log(`To: ${mobile}`);
      console.log('Template: machine_startup_reminder');
      console.log('Parameters:');
      console.log(`  1. Name: ${userName}`);
      console.log(`  2. Machine: ${machineName}`);
      console.log(`  3. Time: ${formattedTime}`);
      console.log('\nRendered Message:');
      console.log(`Hello ${userName},`);
      console.log('');
      console.log('This is a reminder to start the machine before production begins:');
      console.log('');
      console.log(`Machine: ${machineName}`);
      console.log(`Scheduled Start Time: ${formattedTime}`);
      console.log('');
      console.log('Please ensure the machine is properly warmed up and ready for production.');
      console.log('');
      console.log('Reply with your status.');
      console.log('');
      console.log('- KINTO Operations Team');
      console.log('='.repeat(60) + '\n');
      return;
    }

    // Production mode with Meta WhatsApp Cloud API using approved template
    try {
      // Format phone number for Meta API (expects: "919876543210" - country code + number without +)
      let phoneNumber = mobile.replace(/\D/g, ''); // Remove non-digits
      
      // Handle various input formats
      if (phoneNumber.startsWith('0')) {
        // Remove leading zero (e.g., "09876543210" -> "9876543210")
        phoneNumber = phoneNumber.substring(1);
      }
      
      // Add country code if not present (assuming India +91)
      if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
        phoneNumber = `91${phoneNumber}`;
      } else if (phoneNumber.startsWith('91') && phoneNumber.length === 12) {
        // Already has country code, use as is
      } else {
        console.warn(`[NOTIFICATION WARNING] Unusual phone number format: ${mobile} -> ${phoneNumber}`);
      }

      console.log(`[NOTIFICATION] Sending WhatsApp template to ${phoneNumber}`);

      // Use approved template: machine_startup_reminder
      // Template parameters: {{1}} = userName, {{2}} = machineName, {{3}} = scheduledTime
      const success = await whatsappService.sendTemplateMessage({
        to: phoneNumber,
        templateName: 'machine_startup_reminder',
        languageCode: 'en',
        parameters: [
          userName,
          machineName,
          formattedTime
        ]
      });

      if (success) {
        console.log(`[NOTIFICATION] WhatsApp template sent successfully to ${phoneNumber}`);
      } else {
        throw new Error('WhatsApp template send failed - check Meta API credentials and template approval');
      }
    } catch (error) {
      console.error('[NOTIFICATION ERROR] Meta WhatsApp Cloud API failed:', error);
      throw error;
    }
  }

  /**
   * Send Email message via SendGrid (or console in test mode)
   */
  private async sendEmailMessage(
    email: string,
    userName: string,
    machineName: string,
    scheduledTime: Date,
    config: any
  ): Promise<void> {
    const formattedTime = scheduledTime.toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    });

    const subject = `Machine Startup Reminder - ${machineName}`;
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .machine-info { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #1e40af; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Machine Startup Reminder</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${userName}</strong>,</p>
      <p>This is a reminder to start the following machine before production begins:</p>
      <div class="machine-info">
        <p><strong>Machine:</strong> ${machineName}</p>
        <p><strong>Scheduled Start Time:</strong> ${formattedTime}</p>
      </div>
      <p>Please ensure the machine is properly warmed up and ready for production.</p>
    </div>
    <div class="footer">
      <p>This is an automated notification from KINTO QA Management System</p>
      <p>If you have any questions, please contact your supervisor.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Test mode OR missing environment variable - log to console
    if (config.testMode === 1 || !process.env.SENDGRID_API_KEY) {
      console.log('\n' + '='.repeat(60));
      console.log('[EMAIL NOTIFICATION - TEST MODE]');
      console.log('='.repeat(60));
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body (HTML): ${htmlBody}`);
      console.log('='.repeat(60) + '\n');
      return;
    }

    // Production mode with SendGrid API key configured
    try {
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);

      const from = config.senderEmail || 'noreply@kinto.com';
      const fromName = config.senderName || 'KINTO QA System';

      await sgMail.default.send({
        to: email,
        from: {
          email: from,
          name: fromName
        },
        subject,
        html: htmlBody
      });

      console.log(`[EMAIL SENT] To: ${email}, Machine: ${machineName}`);
    } catch (error) {
      console.error('[EMAIL ERROR]', error);
      throw error;
    }
  }

  /**
   * Send WhatsApp notification for missed checklist
   */
  private async sendMissedChecklistWhatsApp(
    mobile: string,
    recipientName: string,
    operatorName: string,
    machineName: string,
    checklistName: string,
    dueDateTime: Date,
    config: any
  ): Promise<void> {
    const formattedDueTime = dueDateTime.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    });

    // Set WhatsApp credentials dynamically (database takes precedence over env vars)
    if (config.metaPhoneNumberId && config.metaAccessToken) {
      whatsappService.setCredentials({
        phoneNumberId: config.metaPhoneNumberId,
        accessToken: config.metaAccessToken
      });
    } else if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
      whatsappService.setCredentials({
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN
      });
    }

    // Test mode - log to console
    if (config.testMode === 1) {
      console.log('\n' + '='.repeat(60));
      console.log('[MISSED CHECKLIST WHATSAPP - TEST MODE]');
      console.log('='.repeat(60));
      console.log(`To: ${recipientName} (${mobile})`);
      console.log('Template: missed_checklist_alert');
      console.log('Parameters:');
      console.log(`  1. Operator: ${operatorName}`);
      console.log(`  2. Machine: ${machineName}`);
      console.log(`  3. Checklist: ${checklistName}`);
      console.log(`  4. Due: ${formattedDueTime}`);
      console.log('\nRendered Message:');
      console.log('KINTO Missed Checklist Alert');
      console.log('');
      console.log(`Operator ${operatorName} has not completed the following checklist:`);
      console.log('');
      console.log(`Machine: ${machineName}`);
      console.log(`Checklist: ${checklistName}`);
      console.log(`Due Time: ${formattedDueTime}`);
      console.log('');
      console.log('Please take immediate action.');
      console.log('');
      console.log('- KINTO QA System');
      console.log('='.repeat(60) + '\n');
      return;
    }

    // Production mode with Meta WhatsApp Cloud API using approved template
    try {
      // Format phone number for Meta API
      let phoneNumber = mobile.replace(/\D/g, '');
      
      if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1);
      }
      
      if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
        phoneNumber = `91${phoneNumber}`;
      }

      // Use approved template: missed_checklist_alert
      // Template parameters: {{1}} = operatorName, {{2}} = machineName, {{3}} = checklistName, {{4}} = dueTime
      const success = await whatsappService.sendTemplateMessage({
        to: phoneNumber,
        templateName: 'missed_checklist_alert',
        languageCode: 'en',
        parameters: [
          operatorName,
          machineName,
          checklistName,
          formattedDueTime
        ]
      });

      if (success) {
        console.log(`[MISSED CHECKLIST WHATSAPP SENT] To: ${recipientName} (${phoneNumber})`);
      } else {
        throw new Error('WhatsApp template send failed - check Meta API credentials and template approval');
      }
    } catch (error) {
      console.error(`[WHATSAPP ERROR] Failed to send to ${recipientName}:`, error);
      // Don't throw - continue sending to other recipients
    }
  }

  /**
   * Send missed checklist notifications to multiple recipients
   */
  async sendMissedChecklistNotifications(
    assignmentId: string,
    operatorName: string,
    operatorMobile: string,
    reviewerName: string | null,
    reviewerMobile: string | null,
    managerName: string,
    managerMobile: string,
    machineName: string,
    checklistName: string,
    dueDateTime: Date
  ): Promise<void> {
    // Fetch notification configuration
    const config = await storage.getNotificationConfig();
    
    // Check if WhatsApp notifications are enabled
    if (!config || config.whatsappEnabled !== 1) {
      console.log(`[MISSED CHECKLIST] Notifications disabled, skipping for assignment ${assignmentId}`);
      return;
    }

    // Get all admins
    const admins = await storage.getUsersByRole('admin');

    const recipients = [
      { name: operatorName, mobile: operatorMobile, role: 'Operator' },
      ...(reviewerName && reviewerMobile ? [{ name: reviewerName, mobile: reviewerMobile, role: 'Reviewer' }] : []),
      { name: managerName, mobile: managerMobile, role: 'Manager' },
      ...admins.map(admin => ({ 
        name: `${admin.firstName} ${admin.lastName}`, 
        mobile: admin.mobileNumber, 
        role: 'Admin' 
      }))
    ];

    console.log(`[MISSED CHECKLIST] Sending notifications to ${recipients.length} recipients for assignment ${assignmentId}`);

    // Send to all recipients
    for (const recipient of recipients) {
      try {
        await this.sendMissedChecklistWhatsApp(
          recipient.mobile,
          recipient.name,
          operatorName,
          machineName,
          checklistName,
          dueDateTime,
          config
        );
      } catch (error) {
        console.error(`[MISSED CHECKLIST ERROR] Failed to notify ${recipient.name} (${recipient.role}):`, error);
      }
    }

    console.log(`[MISSED CHECKLIST] Notifications sent for assignment ${assignmentId}`);
  }

  /**
   * Check for missed checklists and send notifications
   * This should be called periodically (e.g., every 5 minutes via setInterval)
   */
  async checkAndSendMissedChecklistNotifications(): Promise<void> {
    try {
      const missedAssignments = await storage.getMissedChecklistAssignments();
      
      for (const assignment of missedAssignments) {
        // Fetch operator
        const operator = await storage.getUser(assignment.operatorId);
        if (!operator) {
          console.error(`[MISSED CHECKLIST ERROR] Operator not found for assignment ${assignment.id}`);
          continue;
        }

        // Fetch reviewer (optional)
        let reviewer = null;
        if (assignment.reviewerId) {
          reviewer = await storage.getUser(assignment.reviewerId);
        }

        // Fetch manager (assigned by)
        const manager = await storage.getUser(assignment.assignedBy);
        if (!manager) {
          console.error(`[MISSED CHECKLIST ERROR] Manager not found for assignment ${assignment.id}`);
          continue;
        }

        // Fetch machine
        const machine = await storage.getMachine(assignment.machineId);
        if (!machine) {
          console.error(`[MISSED CHECKLIST ERROR] Machine not found for assignment ${assignment.id}`);
          continue;
        }

        // Fetch checklist template
        const template = await storage.getChecklistTemplate(assignment.templateId);
        if (!template) {
          console.error(`[MISSED CHECKLIST ERROR] Template not found for assignment ${assignment.id}`);
          continue;
        }

        // Send notifications to all recipients
        await this.sendMissedChecklistNotifications(
          assignment.id,
          `${operator.firstName} ${operator.lastName}`,
          operator.mobileNumber,
          reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : null,
          reviewer ? reviewer.mobileNumber : null,
          `${manager.firstName} ${manager.lastName}`,
          manager.mobileNumber,
          machine.name,
          template.name,
          assignment.dueDateTime!
        );

        // Mark as notified
        await storage.updateChecklistAssignment(assignment.id, {
          missedNotificationSent: 1,
          missedNotificationSentAt: new Date()
        } as any);

        console.log(`[MISSED CHECKLIST] Notification complete for assignment ${assignment.id}`);
      }
    } catch (error) {
      console.error('[MISSED CHECKLIST CHECK ERROR]', error);
    }
  }

  /**
   * Send checklist tasks via WhatsApp to operator
   */
  async sendChecklistViaWhatsApp(
    assignmentId: string,
    operatorName: string,
    operatorMobile: string,
    machineName: string,
    checklistName: string,
    tasks: Array<{ taskName: string; verificationCriteria?: string | null }>,
    dueDateTime: Date
  ): Promise<boolean> {
    try {
      // Generate unique task reference ID
      const taskReferenceId = this.generateTaskReference('CL');
      
      // Update assignment with reference ID and notification status
      await storage.updateChecklistAssignment(assignmentId, { 
        taskReferenceId,
        whatsappNotificationSent: 1,
        whatsappNotificationSentAt: new Date()
      });

      // Fetch notification configuration
      const config = await storage.getNotificationConfig();

      // Set WhatsApp credentials dynamically
      if (config?.metaPhoneNumberId && config?.metaAccessToken) {
        whatsappService.setCredentials({
          phoneNumberId: config.metaPhoneNumberId,
          accessToken: config.metaAccessToken
        });
      } else if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
        whatsappService.setCredentials({
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
          accessToken: process.env.WHATSAPP_ACCESS_TOKEN
        });
      }

      const formattedDueTime = dueDateTime.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata'
      });

      // Format tasks list for follow-up message
      let taskList = '';
      tasks.forEach((task, index) => {
        taskList += `${index + 1}. ${task.taskName}\n`;
        if (task.verificationCriteria) {
          taskList += `   (${task.verificationCriteria})\n`;
        }
      });

      const taskDetailsMessage = `📋 *Task Details for ${taskReferenceId}*\n\nTasks to Complete:\n${taskList}\nReply with task results in this format:\n${taskReferenceId} 1:OK 2:OK 3:NOK-remarks\n\nExample:\n${taskReferenceId} 1:OK 2:OK 3:NOK-Oil leak found`;

      // Test mode - log to console
      if (config?.testMode === 1) {
        console.log('\n' + '='.repeat(60));
        console.log('[CHECKLIST WHATSAPP - TEST MODE]');
        console.log('='.repeat(60));
        console.log(`To: ${operatorName} (${operatorMobile})`);
        console.log('\n--- MESSAGE 1: Template (qa_checklist_assigned) ---');
        console.log('Parameters:');
        console.log(`  1. Operator: ${operatorName}`);
        console.log(`  2. Task ID: ${taskReferenceId}`);
        console.log(`  3. Machine: ${machineName}`);
        console.log(`  4. Checklist: ${checklistName}`);
        console.log(`  5. Due: ${formattedDueTime}`);
        console.log('\nRendered:');
        console.log(`Hello ${operatorName},`);
        console.log('');
        console.log('New QA Checklist Assigned:');
        console.log('');
        console.log(`Task ID: ${taskReferenceId}`);
        console.log(`Machine: ${machineName}`);
        console.log(`Checklist: ${checklistName}`);
        console.log(`Due: ${formattedDueTime}`);
        console.log('');
        console.log('Please complete this checklist on time.');
        console.log('');
        console.log('Reply with your status or questions.');
        console.log('');
        console.log('- KINTO QA Team');
        console.log('\n--- MESSAGE 2: Task Details (Free-form) ---');
        console.log(taskDetailsMessage);
        console.log('='.repeat(60) + '\n');
        return true;
      }

      // Production mode - send via WhatsApp using approved template + follow-up with task details
      let phoneNumber = operatorMobile.replace(/\D/g, '');
      
      if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1);
      }
      
      if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
        phoneNumber = `91${phoneNumber}`;
      }

      // Step 1: Send approved template (qa_checklist_assigned) to initiate conversation
      const templateSuccess = await whatsappService.sendTemplateMessage({
        to: phoneNumber,
        templateName: 'qa_checklist_assigned',
        languageCode: 'en',
        parameters: [
          operatorName,
          taskReferenceId,
          machineName,
          checklistName,
          formattedDueTime
        ]
      });

      if (!templateSuccess) {
        throw new Error('WhatsApp template send failed - check Meta API credentials and template approval');
      }

      // Step 2: Send follow-up free-form message with task details (allowed within 24-hour window after template)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between messages
      
      const taskDetailsSuccess = await whatsappService.sendTextMessage({
        to: phoneNumber,
        message: taskDetailsMessage
      });

      if (taskDetailsSuccess) {
        console.log(`[CHECKLIST WHATSAPP SENT] To: ${operatorName} (${phoneNumber}), Checklist: ${checklistName} (template + task details)`);
        return true;
      } else {
        console.warn(`[CHECKLIST WHATSAPP] Template sent but task details failed for ${operatorName}`);
        return true; // Template was sent successfully, task details failure is not critical
      }
    } catch (error) {
      console.error(`[CHECKLIST WHATSAPP ERROR] Failed to send to ${operatorName}:`, error);
      return false;
    }
  }

  /**
   * Check for pending reminders and send notifications
   * This should be called periodically (e.g., every 5 minutes via setInterval)
   */
  async checkAndSendReminders(): Promise<void> {
    try {
      const pendingTasks = await storage.getPendingStartupTasks();
      const now = new Date();

      for (const task of pendingTasks) {
        const scheduledTime = new Date(task.scheduledStartTime);
        const reminderTime = new Date(scheduledTime.getTime() - task.reminderBeforeMinutes * 60 * 1000);

        // Check if it's time to send reminder
        if (now >= reminderTime && now < scheduledTime) {
          // Fetch user and machine details
          const user = await storage.getUser(task.assignedUserId);
          const machine = await storage.getMachine(task.machineId);

          if (!user || !machine) {
            console.error(`[REMINDER ERROR] User or Machine not found for task ${task.id}`);
            continue;
          }

          // Send notifications
          const result = await this.sendStartupReminder(
            task.id,
            `${user.firstName} ${user.lastName}`,
            user.mobileNumber,
            user.email || '',
            machine.name,
            scheduledTime,
            task.whatsappEnabled === 1,
            task.emailEnabled === 1
          );

          // Update task status
          await storage.updateMachineStartupTask(task.id, {
            status: 'notified',
            notificationSentAt: now,
            whatsappSent: result.whatsappSent ? 1 : 0,
            emailSent: result.emailSent ? 1 : 0
          });

          console.log(`[REMINDER SENT] Task ${task.id} - Machine: ${machine.name}, User: ${user.username}`);
        }
      }
    } catch (error) {
      console.error('[REMINDER CHECK ERROR]', error);
    }
  }
}

export const notificationService = new NotificationService();
