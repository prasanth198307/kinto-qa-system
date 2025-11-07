/**
 * Notification Service for Machine Startup Reminders
 * 
 * Currently logs notifications to console (like password reset system).
 * Can be upgraded to send real WhatsApp/Email notifications by:
 * 1. Adding Twilio integration for WhatsApp
 * 2. Adding SendGrid/Resend integration for Email
 * 3. Storing API credentials in environment secrets
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

    // Send WhatsApp notification if enabled
    if (whatsappEnabled) {
      try {
        await this.sendWhatsAppMessage(userMobile, userName, machineName, scheduledTime);
        result.whatsappSent = true;
      } catch (error) {
        result.whatsappError = error instanceof Error ? error.message : 'WhatsApp send failed';
        console.error(`[NOTIFICATION ERROR] WhatsApp failed for ${userName}:`, result.whatsappError);
      }
    }

    // Send Email notification if enabled
    if (emailEnabled) {
      try {
        await this.sendEmailMessage(userEmail, userName, machineName, scheduledTime);
        result.emailSent = true;
      } catch (error) {
        result.emailError = error instanceof Error ? error.message : 'Email send failed';
        console.error(`[NOTIFICATION ERROR] Email failed for ${userName}:`, result.emailError);
      }
    }

    return result;
  }

  /**
   * Send WhatsApp message (Currently logs to console)
   * 
   * TO UPGRADE: Replace with Twilio WhatsApp API
   * - Install: npm install twilio
   * - Add env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
   * - Create approved message template in Twilio console
   * - Replace console.log with actual Twilio API call
   */
  private async sendWhatsAppMessage(
    mobile: string,
    userName: string,
    machineName: string,
    scheduledTime: Date
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

    // Console logging (like password reset system)
    console.log('\n' + '='.repeat(60));
    console.log('[WHATSAPP NOTIFICATION]');
    console.log('='.repeat(60));
    console.log(`To: ${mobile}`);
    console.log(`Message:\n${message}`);
    console.log('='.repeat(60) + '\n');

    // TODO: Replace with actual Twilio API call when ready
    // const client = new Twilio(accountSid, authToken);
    // await client.messages.create({
    //   from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    //   to: `whatsapp:${mobile}`,
    //   body: message
    // });
  }

  /**
   * Send Email message (Currently logs to console)
   * 
   * TO UPGRADE: Replace with SendGrid/Resend API
   * - Install: npm install @sendgrid/mail OR npm install resend
   * - Add env: SENDGRID_API_KEY OR RESEND_API_KEY
   * - Replace console.log with actual email API call
   */
  private async sendEmailMessage(
    email: string,
    userName: string,
    machineName: string,
    scheduledTime: Date
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

    // Console logging (like password reset system)
    console.log('\n' + '='.repeat(60));
    console.log('[EMAIL NOTIFICATION]');
    console.log('='.repeat(60));
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (HTML): ${htmlBody}`);
    console.log('='.repeat(60) + '\n');

    // TODO: Replace with actual SendGrid/Resend API call when ready
    // Using SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    // await sgMail.send({
    //   to: email,
    //   from: 'noreply@kinto.com',
    //   subject,
    //   html: htmlBody
    // });

    // Using Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'KINTO QA <noreply@kinto.com>',
    //   to: email,
    //   subject,
    //   html: htmlBody
    // });
  }

  /**
   * Check for pending reminders and send notifications
   * This should be called periodically (e.g., every minute via setInterval)
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
