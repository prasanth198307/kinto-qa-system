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
import { whatsappConversationService } from './whatsappConversationService';

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

      // Production mode - start interactive WhatsApp conversation
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

      // Step 2: Get assignment details to start interactive conversation
      const assignment = await storage.getChecklistAssignment(assignmentId);
      if (!assignment) {
        throw new Error('Assignment not found');
      }

      // Step 3: Start interactive conversation (asks questions one by one)
      // This creates a new checklist submission and starts asking questions
      await whatsappConversationService.startConversation({
        phoneNumber,
        assignmentId: assignment.id,
        templateId: assignment.templateId,
        machineId: assignment.machineId,
        operatorId: assignment.operatorId,
      });

      console.log(`[CHECKLIST WHATSAPP] Interactive conversation started for ${operatorName} (${phoneNumber}), Checklist: ${checklistName}`);
      return true;
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

  /**
   * Check for documents nearing expiry and send notifications
   * This should be called periodically (e.g., every hour via setInterval)
   */
  async checkAndSendDocumentExpiryAlerts(daysBeforeExpiry: number = 30): Promise<void> {
    try {
      const expiringDocs = await storage.getDocumentsNearingExpiry(daysBeforeExpiry);
      
      if (expiringDocs.length === 0) {
        return;
      }

      console.log(`[DOCUMENT EXPIRY] Found ${expiringDocs.length} documents nearing expiry`);

      // Fetch notification configuration
      const config = await storage.getNotificationConfig();
      
      // Get admin users to notify (those with Configuration access)
      const allUsers = await storage.getAllUsers();
      const adminUsers = allUsers.filter(u => 
        u.recordStatus === 1 && 
        (u.roleId === 'admin' || u.username === 'admin')
      );

      if (adminUsers.length === 0) {
        console.log('[DOCUMENT EXPIRY] No admin users to notify');
        return;
      }

      for (const doc of expiringDocs) {
        const daysUntilExpiry = Math.ceil(
          (new Date(doc.expiryDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        // Get category name if available
        let categoryName = 'Uncategorized';
        if (doc.categoryId) {
          const category = await storage.getDocumentCategory(doc.categoryId);
          if (category) categoryName = category.name;
        }

        // Send notification to all admin users
        for (const admin of adminUsers) {
          // Send Email notification
          if (config?.emailEnabled === 1 && admin.email) {
            try {
              await this.sendDocumentExpiryEmail(
                admin.email,
                `${admin.firstName} ${admin.lastName}`,
                doc.title,
                categoryName,
                doc.expiryDate!,
                daysUntilExpiry,
                config
              );
              console.log(`[DOCUMENT EXPIRY EMAIL] Sent to ${admin.email} for document: ${doc.title}`);
            } catch (error) {
              console.error(`[DOCUMENT EXPIRY EMAIL ERROR] Failed for ${admin.email}:`, error);
            }
          }

          // Send WhatsApp notification
          if (config?.whatsappEnabled === 1 && admin.mobileNumber) {
            try {
              await this.sendDocumentExpiryWhatsApp(
                admin.mobileNumber,
                `${admin.firstName} ${admin.lastName}`,
                doc.title,
                categoryName,
                doc.expiryDate!,
                daysUntilExpiry,
                config
              );
              console.log(`[DOCUMENT EXPIRY WHATSAPP] Sent to ${admin.mobileNumber} for document: ${doc.title}`);
            } catch (error) {
              console.error(`[DOCUMENT EXPIRY WHATSAPP ERROR] Failed for ${admin.mobileNumber}:`, error);
            }
          }
        }

        // Mark document as alert sent
        await storage.markDocumentAlertSent(doc.id);
        console.log(`[DOCUMENT EXPIRY] Marked alert sent for document: ${doc.title}`);
      }
    } catch (error) {
      console.error('[DOCUMENT EXPIRY CHECK ERROR]', error);
    }
  }

  /**
   * Send document expiry alert via Email
   */
  private async sendDocumentExpiryEmail(
    email: string,
    recipientName: string,
    documentTitle: string,
    categoryName: string,
    expiryDate: string,
    daysUntilExpiry: number,
    config: any
  ): Promise<void> {
    const formattedExpiry = new Date(expiryDate).toLocaleDateString('en-IN', {
      dateStyle: 'full',
      timeZone: 'Asia/Kolkata'
    });

    const urgencyLevel = daysUntilExpiry <= 7 ? 'URGENT' : daysUntilExpiry <= 14 ? 'Important' : 'Notice';
    const urgencyColor = daysUntilExpiry <= 7 ? '#dc2626' : daysUntilExpiry <= 14 ? '#ea580c' : '#1e40af';

    const subject = `${urgencyLevel}: Document Expiring Soon - ${documentTitle}`;
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${urgencyColor}; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .doc-info { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${urgencyColor}; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    .days-badge { display: inline-block; background: ${urgencyColor}; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Document Expiry Alert</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${recipientName}</strong>,</p>
      <p>The following document is expiring soon and requires attention:</p>
      <div class="doc-info">
        <p><strong>Document:</strong> ${documentTitle}</p>
        <p><strong>Category:</strong> ${categoryName}</p>
        <p><strong>Expiry Date:</strong> ${formattedExpiry}</p>
        <p><span class="days-badge">${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} remaining</span></p>
      </div>
      <p>Please review and renew this document before expiry to ensure business continuity.</p>
    </div>
    <div class="footer">
      <p>This is an automated notification from KINTO Document Management System</p>
      <p>You can view and manage documents in the Documents section.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Test mode OR missing environment variable - log to console
    if (config.testMode === 1 || !process.env.SENDGRID_API_KEY) {
      console.log('\n' + '='.repeat(60));
      console.log('[DOCUMENT EXPIRY EMAIL - TEST MODE]');
      console.log('='.repeat(60));
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Document: ${documentTitle}`);
      console.log(`Expires: ${formattedExpiry} (${daysUntilExpiry} days)`);
      console.log('='.repeat(60) + '\n');
      return;
    }

    // Production mode with SendGrid API key configured
    try {
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);

      const from = config.senderEmail || 'noreply@kinto.com';
      const fromName = config.senderName || 'KINTO Document Management';

      await sgMail.default.send({
        to: email,
        from: {
          email: from,
          name: fromName
        },
        subject,
        html: htmlBody
      });

      console.log(`[DOCUMENT EXPIRY EMAIL SENT] To: ${email}, Document: ${documentTitle}`);
    } catch (error) {
      console.error('[DOCUMENT EXPIRY EMAIL ERROR]', error);
      throw error;
    }
  }

  /**
   * Send document expiry alert via WhatsApp
   */
  private async sendDocumentExpiryWhatsApp(
    mobile: string,
    recipientName: string,
    documentTitle: string,
    categoryName: string,
    expiryDate: string,
    daysUntilExpiry: number,
    config: any
  ): Promise<void> {
    const formattedExpiry = new Date(expiryDate).toLocaleDateString('en-IN', {
      dateStyle: 'medium',
      timeZone: 'Asia/Kolkata'
    });

    // Set WhatsApp credentials dynamically
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
      console.log('[DOCUMENT EXPIRY WHATSAPP - TEST MODE]');
      console.log('='.repeat(60));
      console.log(`To: ${recipientName} (${mobile})`);
      console.log('Message:');
      console.log(`KINTO Document Expiry Alert`);
      console.log('');
      console.log(`Document: ${documentTitle}`);
      console.log(`Category: ${categoryName}`);
      console.log(`Expires: ${formattedExpiry}`);
      console.log(`Days Remaining: ${daysUntilExpiry}`);
      console.log('');
      console.log('Please review and renew this document.');
      console.log('='.repeat(60) + '\n');
      return;
    }

    // Production mode - send plain text message (no template needed for internal alerts)
    try {
      let phoneNumber = mobile.replace(/\D/g, '');
      
      if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1);
      }
      
      if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
        phoneNumber = `91${phoneNumber}`;
      }

      const message = `*KINTO Document Expiry Alert*\n\n` +
        `Document: ${documentTitle}\n` +
        `Category: ${categoryName}\n` +
        `Expires: ${formattedExpiry}\n` +
        `Days Remaining: ${daysUntilExpiry}\n\n` +
        `Please review and renew this document to ensure business continuity.`;

      const success = await whatsappService.sendTextMessage({
        to: phoneNumber,
        message: message
      });

      if (!success) {
        throw new Error('WhatsApp message send failed');
      }

      console.log(`[DOCUMENT EXPIRY WHATSAPP SENT] To: ${phoneNumber}, Document: ${documentTitle}`);
    } catch (error) {
      console.error('[DOCUMENT EXPIRY WHATSAPP ERROR]', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();

// ─── Vertical Notification Service ───────────────────────────────────────────
// Handles EMI due, FD maturity, fee due, appointment reminders,
// hotel check-in confirmations, restaurant order status, etc.

import { db } from "./db";
import { sql } from "drizzle-orm";
import nodemailer from "nodemailer";

function formatPhone(mobile: string): string {
  let p = (mobile || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = p.substring(1);
  if (!p.startsWith("91") && p.length === 10) p = `91${p}`;
  return p;
}

function indDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
}

async function sendWA(mobile: string, message: string): Promise<boolean> {
  try {
    const phone = formatPhone(mobile);
    if (!phone) return false;
    return await whatsappService.sendTextMessage({ to: phone, message });
  } catch {
    return false;
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY && !process.env.SMTP_HOST) {
    console.log(`[EMAIL TEST] To: ${to} | Subject: ${subject}`);
    return true;
  }
  try {
    if (process.env.SENDGRID_API_KEY) {
      const sg = await import("@sendgrid/mail");
      sg.default.setApiKey(process.env.SENDGRID_API_KEY);
      await sg.default.send({ to, from: process.env.SENDER_EMAIL || "noreply@swacherp.com", subject, html });
    } else {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({ from: process.env.SENDER_EMAIL || "noreply@swacherp.com", to, subject, html });
    }
    return true;
  } catch (err) {
    console.error("[EMAIL ERROR]", err);
    return false;
  }
}

export class VerticalNotificationService {
  // ── Nidhi: EMI due reminder ─────────────────────────────────────────────────
  async sendEMIDueReminder(tenantId: number): Promise<number> {
    let sent = 0;
    try {
      const loans = await db.execute(sql`
        SELECT l.id, l.loan_number, l.next_emi_date, l.emi_amount,
               m.name as member_name, m.phone as member_phone, m.email as member_email
        FROM nidhi_loans l
        JOIN nidhi_members m ON l.member_id = m.id
        WHERE l.tenant_id = ${tenantId}
          AND l.status IN ('active', 'disbursed')
          AND l.next_emi_date IS NOT NULL
          AND l.next_emi_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
          AND l.emi_reminder_sent IS DISTINCT FROM CURRENT_DATE
      `);
      for (const loan of loans.rows as any[]) {
        const msg = `Dear ${loan.member_name}, your loan EMI of ₹${(loan.emi_amount / 100).toFixed(2)} for Loan #${loan.loan_number} is due on ${indDate(loan.next_emi_date)}. Please ensure timely payment to avoid penalty.`;
        if (loan.member_phone) await sendWA(loan.member_phone, msg);
        if (loan.member_email) await sendEmail(loan.member_email, `EMI Due Reminder — Loan #${loan.loan_number}`, `<p>${msg}</p>`);
        await db.execute(sql`UPDATE nidhi_loans SET emi_reminder_sent = CURRENT_DATE WHERE id = ${loan.id}`).catch(() => {});
        sent++;
      }
    } catch (e) { console.error("[NIDHI EMI REMINDER]", e); }
    return sent;
  }

  // ── Nidhi: FD maturity alert ────────────────────────────────────────────────
  async sendFDMaturityAlert(tenantId: number): Promise<number> {
    let sent = 0;
    try {
      const fds = await db.execute(sql`
        SELECT d.id, d.deposit_number, d.maturity_date, d.principal_amount, d.interest_rate,
               m.name as member_name, m.phone as member_phone, m.email as member_email
        FROM nidhi_deposits d
        JOIN nidhi_members m ON d.member_id = m.id
        WHERE d.tenant_id = ${tenantId}
          AND d.status = 'active'
          AND d.maturity_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
          AND d.maturity_alert_sent IS DISTINCT FROM CURRENT_DATE
      `);
      for (const fd of fds.rows as any[]) {
        const msg = `Dear ${fd.member_name}, your Fixed Deposit #${fd.deposit_number} (₹${(fd.principal_amount / 100).toFixed(2)} @ ${fd.interest_rate}% p.a.) matures on ${indDate(fd.maturity_date)}. Please contact us to renew or withdraw.`;
        if (fd.member_phone) await sendWA(fd.member_phone, msg);
        if (fd.member_email) await sendEmail(fd.member_email, `FD Maturity Alert — ${fd.deposit_number}`, `<p>${msg}</p>`);
        await db.execute(sql`UPDATE nidhi_deposits SET maturity_alert_sent = CURRENT_DATE WHERE id = ${fd.id}`).catch(() => {});
        sent++;
      }
    } catch (e) { console.error("[NIDHI FD MATURITY]", e); }
    return sent;
  }

  // ── Education: fee due reminder ─────────────────────────────────────────────
  async sendFeeDueReminder(tenantId: number): Promise<number> {
    let sent = 0;
    try {
      const dues = await db.execute(sql`
        SELECT sfl.student_id, sfl.balance, s.name as student_name,
               s.parent_name, s.parent_phone, s.parent_email, s.admission_number
        FROM student_fee_ledger sfl
        JOIN education_students s ON s.id = sfl.student_id
        WHERE sfl.tenant_id = ${tenantId}
          AND sfl.balance > 0
          AND s.status = 'active'
          AND (sfl.last_reminder IS NULL OR sfl.last_reminder < CURRENT_DATE - INTERVAL '7 days')
        ORDER BY sfl.student_id, sfl.created_at DESC
      `).catch(() => ({ rows: [] }));
      const seen = new Set<number>();
      for (const d of dues.rows as any[]) {
        if (seen.has(d.student_id)) continue;
        seen.add(d.student_id);
        const msg = `Dear ${d.parent_name || "Parent"}, fee dues of ₹${(d.balance / 100).toFixed(2)} are pending for ${d.student_name} (Adm: ${d.admission_number}). Please pay at the earliest to avoid late fees.`;
        if (d.parent_phone) await sendWA(d.parent_phone, msg);
        if (d.parent_email) await sendEmail(d.parent_email, `Fee Due Reminder — ${d.student_name}`, `<p>${msg}</p>`);
        await db.execute(sql`UPDATE student_fee_ledger SET last_reminder = CURRENT_DATE WHERE student_id = ${d.student_id} AND tenant_id = ${tenantId}`).catch(() => {});
        sent++;
      }
    } catch (e) { console.error("[EDUCATION FEE DUE]", e); }
    return sent;
  }

  // ── Healthcare: appointment reminder ───────────────────────────────────────
  async sendAppointmentReminder(tenantId: number): Promise<number> {
    let sent = 0;
    try {
      const appts = await db.execute(sql`
        SELECT a.id, a.appointment_date, a.appointment_time, a.doctor_name,
               a.patient_name, a.patient_phone, a.patient_email
        FROM healthcare_appointments a
        WHERE a.tenant_id = ${tenantId}
          AND a.status IN ('confirmed', 'scheduled')
          AND a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
          AND a.reminder_sent IS DISTINCT FROM true
      `).catch(() => ({ rows: [] }));
      for (const appt of appts.rows as any[]) {
        const msg = `Dear ${appt.patient_name}, your appointment with Dr. ${appt.doctor_name} is scheduled for ${indDate(appt.appointment_date)} at ${appt.appointment_time || ""}. Please arrive 15 minutes early.`;
        if (appt.patient_phone) await sendWA(appt.patient_phone, msg);
        if (appt.patient_email) await sendEmail(appt.patient_email, `Appointment Reminder — ${indDate(appt.appointment_date)}`, `<p>${msg}</p>`);
        await db.execute(sql`UPDATE healthcare_appointments SET reminder_sent = true WHERE id = ${appt.id}`).catch(() => {});
        sent++;
      }
    } catch (e) { console.error("[HEALTHCARE APPOINTMENT]", e); }
    return sent;
  }

  // ── Hotel: check-in confirmation ────────────────────────────────────────────
  async sendCheckinConfirmation(opts: {
    guestName: string;
    guestPhone?: string;
    guestEmail?: string;
    reservationId: number | string;
    roomNumber: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    hotelName: string;
  }): Promise<void> {
    const msg = `Dear ${opts.guestName}, your reservation at ${opts.hotelName} is confirmed! Room: ${opts.roomNumber} | Check-in: ${indDate(opts.checkInDate)} | Check-out: ${indDate(opts.checkOutDate)} | Nights: ${opts.nights}. We look forward to welcoming you.`;
    if (opts.guestPhone) await sendWA(opts.guestPhone, msg);
    if (opts.guestEmail) await sendEmail(opts.guestEmail, `Reservation Confirmed — ${opts.hotelName}`, `<p>${msg}</p>`);
  }

  // ── Restaurant: order status update ────────────────────────────────────────
  async sendOrderStatusUpdate(opts: {
    customerPhone?: string;
    customerEmail?: string;
    customerName: string;
    orderNumber: string;
    status: string;
    estimatedTime?: string;
  }): Promise<void> {
    const statusLabel: Record<string, string> = {
      confirmed: "confirmed and being prepared",
      ready: "ready for pickup/delivery",
      out_for_delivery: "out for delivery",
      delivered: "delivered",
      cancelled: "cancelled",
    };
    const statusText = statusLabel[opts.status] || opts.status;
    const msg = `Dear ${opts.customerName}, your order #${opts.orderNumber} has been ${statusText}.${opts.estimatedTime ? ` Estimated time: ${opts.estimatedTime}.` : ""}`;
    if (opts.customerPhone) await sendWA(opts.customerPhone, msg);
    if (opts.customerEmail) await sendEmail(opts.customerEmail, `Order Update — #${opts.orderNumber}`, `<p>${msg}</p>`);
  }

  // ── Run all daily background reminders for a tenant ────────────────────────
  async runDailyReminders(tenantId: number): Promise<{ emi: number; fd: number; fee: number; appt: number }> {
    const [emi, fd, fee, appt] = await Promise.all([
      this.sendEMIDueReminder(tenantId),
      this.sendFDMaturityAlert(tenantId),
      this.sendFeeDueReminder(tenantId),
      this.sendAppointmentReminder(tenantId),
    ]);
    return { emi, fd, fee, appt };
  }
}

export const verticalNotificationService = new VerticalNotificationService();
