import { Router, Request, Response } from 'express';
import { WebhookService } from '../services/webhookService';
import { WebhookPayload } from '../types/webhook';
import { verifySignature, extractSignature } from '../utils/crypto';

const router = Router();
const webhookService = WebhookService.getInstance();

/**
 * Webhook endpoint to receive notifications
 * POST /webhook
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const payload: WebhookPayload = req.body;
    
    // Validate required fields
    if (!payload.type || !payload.title || !payload.content || !payload.timestamp) {
      return res.status(400).json({
        error: 'Missing required fields: type, title, content, timestamp',
      });
    }

    // Get request metadata
    const userAgent = req.get('User-Agent');
    const sourceIp = req.ip || req.connection.remoteAddress;
    const authHeader = req.get('Authorization');
    const signatureHeader = req.get('X-Webhook-Signature');

    // Verify signature if secret is configured
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret && signatureHeader) {
      const rawBody = JSON.stringify(req.body);
      const isValidSignature = verifySignature(webhookSecret, rawBody, signatureHeader);
      
      if (!isValidSignature) {
        console.warn('Invalid webhook signature received', {
          sourceIp,
          userAgent,
          type: payload.type,
        });
        return res.status(401).json({
          error: 'Invalid signature',
        });
      }
    }

    // Store the webhook message
    const webhookRequest = {
      ...payload,
      userAgent,
      sourceIp,
      signature: signatureHeader,
    };

    const storedMessage = await webhookService.storeWebhookMessage(webhookRequest);

    console.log('Webhook received and stored:', {
      id: storedMessage.id,
      type: storedMessage.type,
      title: storedMessage.title,
      sourceIp,
      timestamp: new Date(Number(storedMessage.timestamp) * 1000).toISOString(),
    });

    res.status(200).json({
      success: true,
      message: 'Webhook received successfully',
      id: storedMessage.id,
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * Health check for webhook endpoint
 * GET /webhook/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    endpoint: 'webhook',
    timestamp: new Date().toISOString(),
  });
});

export { router as webhookRouter };
