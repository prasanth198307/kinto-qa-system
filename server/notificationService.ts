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
   * Generate unique task reference ID (e.g., MST-A1B2C3)
   */
  private generateTaskReference(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ref = 'MST-';
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
      const message = `KINTO Machine Startup Reminder

Hello ${userName},

Please start the following machine:
Machine: ${machineName}
Scheduled Time: ${formattedTime}

Reply "Done ${taskReferenceId}" when started
Task ID: ${taskReferenceId}

- KINTO QA System`;

      console.log('\n' + '='.repeat(60));
      console.log('[WHATSAPP NOTIFICATION - TEST MODE]');
      console.log('='.repeat(60));
      console.log(`To: ${mobile}`);
      console.log(`Message:\n${message}`);
      console.log('='.repeat(60) + '\n');
      return;
    }

    // Production mode with Meta WhatsApp Cloud API
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

      console.log(`[NOTIFICATION] Sending WhatsApp to ${phoneNumber}`);

      const success = await whatsappService.sendMachineStartupReminder(
        phoneNumber,
        machineName,
        formattedTime,
        taskReferenceId
      );

      if (success) {
        console.log(`[NOTIFICATION] WhatsApp sent successfully to ${phoneNumber}`);
      } else {
        throw new Error('WhatsApp send failed - check Meta API credentials');
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

    const message = `KINTO Missed Checklist Alert

Checklist Not Completed:
Operator: ${operatorName}
Machine: ${machineName}
Checklist: ${checklistName}
Due Time: ${formattedDueTime}

This checklist was not completed on time. Please take immediate action.

- KINTO QA System`;

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
      console.log(`Message:\n${message}`);
      console.log('='.repeat(60) + '\n');
      return;
    }

    // Production mode with Meta WhatsApp Cloud API
    try {
      // Format phone number for Meta API
      let phoneNumber = mobile.replace(/\D/g, '');
      
      if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1);
      }
      
      if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
        phoneNumber = `91${phoneNumber}`;
      }

      const success = await whatsappService.sendTextMessage({
        to: phoneNumber,
        message
      });

      if (success) {
        console.log(`[MISSED CHECKLIST WHATSAPP SENT] To: ${recipientName} (${phoneNumber})`);
      } else {
        throw new Error('WhatsApp send failed - check Meta API credentials');
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
