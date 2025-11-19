import axios from 'axios';
import { collokiFlowService } from './collokiFlowService';

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';

export interface WhatsAppMessageOptions {
  to: string;
  message: string;
  sessionId?: string; // Optional: If provided, use Colloki Flow as primary channel
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

    // Strategy: Try Colloki Flow first (if session_id provided), fallback to Meta Graph API
    if (options.sessionId) {
      console.log('[WHATSAPP] Trying Colloki Flow as primary channel...');
      
      try {
        const collokiResult = await collokiFlowService.sendWhatsAppMessage({
          message: options.message,
          sessionId: options.sessionId,
        });

        if (collokiResult.success) {
          console.log('[WHATSAPP] ✅ Message sent via Colloki Flow (primary)');
          return true;
        } else {
          console.warn('[WHATSAPP] ⚠️ Colloki Flow failed, falling back to Meta Graph API:', collokiResult.error);
        }
      } catch (error) {
        console.warn('[WHATSAPP] ⚠️ Colloki Flow error, falling back to Meta Graph API:', error);
      }
    }

    // Fallback to Meta Graph API (or primary if no session_id)
    try {
      console.log('[WHATSAPP] Using Meta Graph API' + (options.sessionId ? ' (fallback)' : ' (primary)'));
      
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

      console.log('[WHATSAPP] ✅ Message sent via Meta Graph API:', response.data.messages?.[0]?.id);
      return true;
    } catch (error: any) {
      console.error('[WHATSAPP] ❌ Meta Graph API send error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Send WhatsApp template message
   * Uses approved Meta templates for compliance with postpaid numbers
   */
  async sendTemplateMessage(options: WhatsAppTemplateOptions): Promise<boolean> {
    if (!this.credentials) {
      console.error('WhatsApp credentials not configured');
      return false;
    }

    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        to: options.to,
        type: 'template',
        template: {
          name: options.templateName,
          language: {
            code: options.languageCode || 'en'
          }
        }
      };

      // Add parameters if provided
      if (options.parameters && options.parameters.length > 0) {
        payload.template.components = [
          {
            type: 'body',
            parameters: options.parameters.map(text => ({
              type: 'text',
              text
            }))
          }
        ];
      }

      const response = await axios.post(
        this.getApiUrl(),
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('WhatsApp template message sent successfully:', response.data);
      return true;
    } catch (error: any) {
      console.error('WhatsApp template send error:', error.response?.data || error.message);
      return false;
    }
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

  /**
   * Download WhatsApp media file and save locally
   * @param mediaId - WhatsApp media ID from webhook
   * @param fileName - Desired filename (e.g., "task_2_photo.jpg")
   * @returns Local file path or null if failed
   */
  async downloadMedia(mediaId: string, fileName: string): Promise<string | null> {
    if (!this.credentials) {
      console.error('WhatsApp credentials not configured');
      return null;
    }

    try {
      // Step 1: Get media URL from WhatsApp API
      const mediaUrlResponse = await axios.get(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.accessToken}`
          }
        }
      );

      const mediaUrl = mediaUrlResponse.data.url;
      
      if (!mediaUrl) {
        console.error('No media URL returned from WhatsApp');
        return null;
      }

      // Step 2: Download the actual media file
      const mediaResponse = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`
        },
        responseType: 'arraybuffer'
      });

      // Step 3: Save to local file system
      const fs = require('fs');
      const path = require('path');
      const saveDir = path.join(process.cwd(), 'attached_assets', 'checklist_photos');
      const savePath = path.join(saveDir, fileName);

      // Ensure directory exists
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(savePath, mediaResponse.data);
      
      console.log(`Media downloaded successfully: ${savePath}`);
      
      // Return relative path for database storage
      return `attached_assets/checklist_photos/${fileName}`;
    } catch (error: any) {
      console.error('Media download error:', error.response?.data || error.message);
      return null;
    }
  }
}

export const whatsappService = new WhatsAppService();
