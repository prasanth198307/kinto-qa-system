/**
 * Notification Service for Machine Startup Reminders
 * 
 * Supports both console logging (test mode) and real notification sending:
 * - SendGrid for Email
 * - Twilio for WhatsApp
 * 
 * Configuration stored in database, sensitive credentials in environment variables.
 */

import { storage } from './storage';

export interface NotificationResult {
  whatsappSent: boolean;
  emailSent: boolean;
  whatsappError?: string;
  emailError?: string;
}

export class NotificationService {
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
   * Send WhatsApp message via Twilio (or console in test mode)
   */
  private async sendWhatsAppMessage(
    mobile: string,
    userName: string,
    machineName: string,
    scheduledTime: Date,
    config: any
  ): Promise<void> {
    const formattedTime = scheduledTime.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    });

    const message = `KINTO Machine Startup Reminder

Hello ${userName},

Please start the following machine:
Machine: ${machineName}
Scheduled Time: ${formattedTime}

Ensure the machine is properly warmed up before production begins.

- KINTO QA System`;

    // Test mode OR missing environment variables - log to console
    if (config.testMode === 1 || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('\n' + '='.repeat(60));
      console.log('[WHATSAPP NOTIFICATION - TEST MODE]');
      console.log('='.repeat(60));
      console.log(`To: ${mobile}`);
      console.log(`Message:\n${message}`);
      console.log('='.repeat(60) + '\n');
      return;
    }

    // Production mode with environment variables configured
    try {
      const twilio = await import('twilio');
      const client = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const fromNumber = config.twilioPhoneNumber || 'whatsapp:+14155238886';
      const toNumber = mobile.startsWith('whatsapp:') ? mobile : `whatsapp:+91${mobile}`;

      await client.messages.create({
        from: fromNumber,
        to: toNumber,
        body: message
      });

      console.log(`[WHATSAPP SENT] To: ${mobile}, Machine: ${machineName}`);
    } catch (error) {
      console.error('[WHATSAPP ERROR]', error);
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
