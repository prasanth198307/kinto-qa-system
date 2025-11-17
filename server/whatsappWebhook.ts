/**
 * WhatsApp Webhook Handler
 * Receives incoming messages, photos, and status updates from Meta WhatsApp API
 */

import { Router } from 'express';
import { whatsappConversationService } from './whatsappConversationService';
import { whatsappService } from './whatsappService';

export const whatsappWebhookRouter = Router();

/**
 * Webhook verification (required by Meta)
 * GET /api/whatsapp/webhook
 */
whatsappWebhookRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'KINTO_WHATSAPP_VERIFY_TOKEN_2025';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WHATSAPP WEBHOOK] Verification successful');
    res.status(200).send(challenge);
  } else {
    console.error('[WHATSAPP WEBHOOK] Verification failed');
    res.status(403).send('Forbidden');
  }
});

/**
 * Receive incoming messages
 * POST /api/whatsapp/webhook
 */
whatsappWebhookRouter.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Log webhook for debugging
    console.log('[WHATSAPP WEBHOOK] Received:', JSON.stringify(body, null, 2));

    // Respond immediately to Meta
    res.status(200).send('OK');

    // Process webhook asynchronously
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) return;

      // Handle messages
      if (value.messages && value.messages.length > 0) {
        const message = value.messages[0];
        const from = message.from;

        console.log(`[WHATSAPP] Message from ${from}:`, message);

        // Handle different message types
        if (message.type === 'text') {
          await whatsappConversationService.handleIncomingMessage({
            phoneNumber: from,
            message: message.text.body,
            messageType: 'text',
          });
        } else if (message.type === 'image') {
          // Download image
          const imageUrl = await downloadWhatsAppMedia(message.image.id);

          await whatsappConversationService.handleIncomingMessage({
            phoneNumber: from,
            message: message.image.caption || 'Photo',
            messageType: 'image',
            imageUrl,
          });
        } else if (message.type === 'button') {
          // Handle button responses
          await whatsappConversationService.handleIncomingMessage({
            phoneNumber: from,
            message: message.button.text,
            messageType: 'text',
          });
        }
      }

      // Handle status updates (delivered, read, failed)
      if (value.statuses && value.statuses.length > 0) {
        const status = value.statuses[0];
        console.log(`[WHATSAPP] Status update for message ${status.id}:`, status.status);
      }
    }
  } catch (error) {
    console.error('[WHATSAPP WEBHOOK ERROR]:', error);
  }
});

/**
 * Download media from WhatsApp and save to file system
 */
async function downloadWhatsAppMedia(mediaId: string): Promise<string> {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('WHATSAPP_ACCESS_TOKEN not configured');
    }

    // Step 1: Get media URL
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!mediaResponse.ok) {
      throw new Error(`Failed to get media URL: ${mediaResponse.statusText}`);
    }

    const mediaData = await mediaResponse.json();
    const mediaUrl = mediaData.url;

    // Step 2: Download the actual media file
    const fileResponse = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!fileResponse.ok) {
      throw new Error(`Failed to download media: ${fileResponse.statusText}`);
    }

    // Step 3: Save to file system using streaming (memory efficient)
    const fs = await import('fs');
    const path = await import('path');
    const { Readable } = await import('stream');
    const { pipeline } = await import('stream/promises');
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'whatsapp-photos');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename (sanitized)
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const ext = (mediaData.mime_type?.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '');
    const filename = `${timestamp}-${randomId}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    // Stream to file without buffering entire file in memory
    const fileStream = fs.createWriteStream(filePath);
    const readableStream = Readable.fromWeb(fileResponse.body as any);
    
    await pipeline(readableStream, fileStream);

    // Return relative path (served via restricted static middleware)
    const relativeUrl = `/whatsapp-photos/${filename}`;
    
    console.log(`[WHATSAPP] Streamed media ${mediaId} to ${relativeUrl}`);
    
    return relativeUrl;
  } catch (error) {
    console.error('[WHATSAPP] Media download error:', error);
    return '';
  }
}
