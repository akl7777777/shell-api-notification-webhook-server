import { Router, Request, Response } from 'express';
import { WebhookService } from '../services/webhookService';
import { WebhookQueryParams } from '../types/webhook';
import { AuthMiddleware } from '../middleware/authMiddleware';

const router = Router();
const webhookService = WebhookService.getInstance();

/**
 * Get webhook messages with pagination and filtering
 * GET /api/webhooks
 * 需要管理员权限
 */
router.get('/webhooks', AuthMiddleware.requireAuth, async (req: Request, res: Response) => {
  try {
    const queryParams: WebhookQueryParams = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
      type: req.query.type as string,
      search: req.query.search as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      processed: req.query.processed ? req.query.processed === 'true' : undefined,
    };

    // Validate pagination parameters
    if (queryParams.page && queryParams.page < 1) {
      return res.status(400).json({
        error: 'Page must be greater than 0',
      });
    }

    if (queryParams.pageSize && (queryParams.pageSize < 1 || queryParams.pageSize > 100)) {
      return res.status(400).json({
        error: 'Page size must be between 1 and 100',
      });
    }

    const result = await webhookService.getWebhookMessages(queryParams);

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Error fetching webhook messages:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * Get webhook statistics
 * GET /api/webhooks/stats
 * 需要管理员权限
 */
router.get('/webhooks/stats', AuthMiddleware.requireAuth, async (_req: Request, res: Response) => {
  try {
    const stats = await webhookService.getWebhookStats();

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('Error fetching webhook stats:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * Advanced search webhook messages
 * GET /api/webhooks/search
 * 需要管理员权限
 */
router.get('/webhooks/search', AuthMiddleware.requireAuth, async (req: Request, res: Response) => {
  try {
    const { q: query, ...params } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Search query is required',
      });
    }

    const result = await webhookService.searchWebhookMessages(query, params as WebhookQueryParams);

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Error searching webhook messages:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * Get webhook message by ID
 * GET /api/webhooks/:id
 * 需要管理员权限
 */
router.get('/webhooks/:id', AuthMiddleware.requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const message = await webhookService.getWebhookMessageById(id);

    if (!message) {
      return res.status(404).json({
        error: 'Webhook message not found',
      });
    }

    res.json({
      success: true,
      data: message,
    });

  } catch (error) {
    console.error('Error fetching webhook message:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * Mark webhook message as processed
 * PUT /api/webhooks/:id/processed
 * 需要管理员权限
 */
router.put('/webhooks/:id/processed', AuthMiddleware.requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const message = await webhookService.markAsProcessed(id);

    const responseMessage = {
      ...message,
      timestamp: Number(message.timestamp),
      values: message.values ? (typeof message.values === 'string' ? JSON.parse(message.values) : message.values) : null,
    };

    res.json({
      success: true,
      message: 'Webhook message marked as processed',
      data: responseMessage,
    });

  } catch (error) {
    console.error('Error updating webhook message:', error);
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return res.status(404).json({
        error: 'Webhook message not found',
      });
    }
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * Delete webhook message
 * DELETE /api/webhooks/:id
 * 需要管理员权限
 */
router.delete('/webhooks/:id', AuthMiddleware.requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await webhookService.deleteWebhookMessage(id);

    res.json({
      success: true,
      message: 'Webhook message deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting webhook message:', error);
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return res.status(404).json({
        error: 'Webhook message not found',
      });
    }
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});



/**
 * Get storage health status
 * GET /api/storage/health
 * 需要管理员权限
 */
router.get('/storage/health', AuthMiddleware.requireAuth, async (_req: Request, res: Response) => {
  try {
    const health = await webhookService.getHealthStatus();

    res.json({
      success: true,
      data: health,
    });

  } catch (error) {
    console.error('Error fetching storage health:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * Get batch processor statistics
 * GET /api/queue/stats
 * 需要管理员权限
 */
router.get('/queue/stats', AuthMiddleware.requireAuth, async (_req: Request, res: Response) => {
  try {
    const stats = await webhookService.getBatchStats();

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * Clean up old messages
 * DELETE /api/webhooks/cleanup
 * 需要管理员权限
 */
router.delete('/webhooks/cleanup', AuthMiddleware.requireAuth, async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const daysNumber = parseInt(days as string, 10);

    if (isNaN(daysNumber) || daysNumber < 1) {
      return res.status(400).json({
        error: 'Invalid days parameter',
      });
    }

    const deletedCount = await webhookService.cleanupOldMessages(daysNumber);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old messages`,
      data: { deletedCount },
    });

  } catch (error) {
    console.error('Error cleaning up messages:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * Get WebSocket connection info
 * GET /api/websocket/info
 * 需要管理员权限
 */
router.get('/websocket/info', AuthMiddleware.requireAuth, (_req: Request, res: Response) => {
  const { getConnectedClientsCount } = require('../websocket');

  res.json({
    success: true,
    data: {
      connectedClients: getConnectedClientsCount(),
      serverTime: new Date().toISOString(),
    },
  });
});

export { router as apiRouter };
