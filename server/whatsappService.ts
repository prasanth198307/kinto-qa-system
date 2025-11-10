import axios from 'axios';

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';

export interface WhatsAppMessageOptions {
  to: string;
  message: string;
}

export interface WhatsAppTemplateOptions {
  to: string;
  templateName: string;
  languageCode?: string;
  parameters?: string[];
}

export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
}

export class WhatsAppService {
  private credentials: WhatsAppCredentials | null = null;

  constructor() {
    // Check if env vars are set (fallback)
    const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const envAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    if (envPhoneId && envAccessToken) {
      this.credentials = {
        phoneNumberId: envPhoneId,
        accessToken: envAccessToken
      };
      console.log('WhatsApp configured from environment variables');
    }
  }

  /**
   * Set credentials dynamically (from database or environment)
   * Database credentials take precedence over environment variables
   */
  setCredentials(credentials: WhatsAppCredentials | null) {
    this.credentials = credentials;
    if (credentials) {
      console.log('WhatsApp credentials updated from database configuration');
    }
  }

  private getApiUrl(): string {
    if (!this.credentials) return '';
    return `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${this.credentials.phoneNumberId}/messages`;
  }

  async sendTextMessage(options: WhatsAppMessageOptions): Promise<boolean> {
    if (!this.credentials) {
      console.error('WhatsApp credentials not configured');
      return false;
    }

    try {
      const response = await axios.post(
        this.getApiUrl(),
        {
          messaging_product: 'whatsapp',
          to: options.to,
          type: 'text',
          text: { body: options.message }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('WhatsApp message sent successfully:', response.data);
      return true;
    } catch (error: any) {
      console.error('WhatsApp send error:', error.response?.data || error.message);
      return false;
    }
  }

  async sendMachineStartupReminder(
    phoneNumber: string, 
    machineName: string, 
    scheduledTime: string,
    taskReferenceId: string
  ): Promise<boolean> {
    const message = `MACHINE STARTUP REMINDER\n\n` +
      `Machine: ${machineName}\n` +
      `Scheduled: ${scheduledTime}\n\n` +
      `Reply "Done ${taskReferenceId}" when started\n` +
      `Task ID: ${taskReferenceId}\n\n` +
      `- KINTO QA System`;

    return await this.sendTextMessage({
      to: phoneNumber,
      message
    });
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    if (!this.credentials) return;

    try {
      await axios.post(
        this.getApiUrl(),
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error: any) {
      console.error('Mark as read error:', error.response?.data || error.message);
    }
  }
}

export const whatsappService = new WhatsAppService();
