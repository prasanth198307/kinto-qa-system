import axios from 'axios';

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

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

export class WhatsAppService {
  private apiUrl: string;
  private accessToken: string;
  private phoneNumberId: string;

  constructor() {
    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      console.warn('⚠️  WhatsApp credentials not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN');
    }
    this.phoneNumberId = PHONE_NUMBER_ID || '';
    this.accessToken = ACCESS_TOKEN || '';
    this.apiUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${this.phoneNumberId}/messages`;
  }

  async sendTextMessage(options: WhatsAppMessageOptions): Promise<boolean> {
    if (!this.phoneNumberId || !this.accessToken) {
      console.error('❌ WhatsApp not configured');
      return false;
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          to: options.to,
          type: 'text',
          text: { body: options.message }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ WhatsApp message sent:', response.data);
      return true;
    } catch (error: any) {
      console.error('❌ WhatsApp send error:', error.response?.data || error.message);
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
    if (!this.phoneNumberId || !this.accessToken) return;

    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error: any) {
      console.error('❌ Mark as read error:', error.response?.data || error.message);
    }
  }
}

export const whatsappService = new WhatsAppService();
