import { IStorageAdapter } from '../adapters/interfaces/IStorageAdapter';
import { StorageAdapterFactory, FallbackStorageAdapter } from '../adapters/StorageAdapterFactory';
import { ConfigManager } from '../config/StorageConfig';
import { WebhookPayload, WebhookRequest, WebhookMessage, WebhookQueryParams } from '../types/webhook';
import { broadcastWebhookMessage } from '../websocket';

export class WebhookService {
  private static instance: WebhookService;
  private storageAdapter!: IStorageAdapter;
  private configManager: ConfigManager;

  private constructor() {
    this.configManager = new ConfigManager();
  }

  public static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const primaryConfig = this.configManager.getStorageConfig();
      const fallbackConfig = this.configManager.getFallbackStorageConfig();

      if (fallbackConfig) {
        this.storageAdapter = await StorageAdapterFactory.createFallbackAdapter(
          primaryConfig,
          fallbackConfig
        );
        console.log(`✅ Webhook service initialized with ${primaryConfig.type} (primary) and ${fallbackConfig.type} (fallback)`);
      } else {
        this.storageAdapter = await StorageAdapterFactory.createAdapter(primaryConfig);
        console.log(`✅ Webhook service initialized with ${primaryConfig.type}`);
      }
    } catch (error) {
      console.error('❌ Failed to initialize webhook service:', error);
      throw error;
    }
  }
  /**
   * Store webhook message
   */
  async storeWebhookMessage(payload: WebhookRequest): Promise<WebhookMessage> {
    const messageData = {
      type: payload.type,
      title: payload.title,
      content: payload.content,
      values: payload.values,
      timestamp: payload.timestamp,
      userAgent: payload.userAgent,
      sourceIp: payload.sourceIp,
      signature: payload.signature,
      processed: false,
    };

    const webhookMessage = await this.storageAdapter.storeMessage(messageData);

    // Broadcast to connected WebSocket clients
    broadcastWebhookMessage(webhookMessage);

    return webhookMessage;
  }

  /**
   * Get webhook messages with pagination and filtering
   */
  async getWebhookMessages(params: WebhookQueryParams) {
    return await this.storageAdapter.getMessages(params);
  }

  /**
   * Search webhook messages with advanced query
   */
  async searchWebhookMessages(query: string, params?: WebhookQueryParams) {
    return await this.storageAdapter.searchMessages(query, params);
  }

  /**
   * Get webhook message by ID
   */
  async getWebhookMessageById(id: string): Promise<WebhookMessage | null> {
    return await this.storageAdapter.getMessageById(id);
  }

  /**
   * Mark webhook message as processed
   */
  async markAsProcessed(id: string): Promise<WebhookMessage> {
    return await this.storageAdapter.updateMessage(id, { processed: true });
  }

  /**
   * Update webhook message
   */
  async updateWebhookMessage(id: string, updates: Partial<WebhookMessage>): Promise<WebhookMessage> {
    return await this.storageAdapter.updateMessage(id, updates);
  }

  /**
   * Delete webhook message
   */
  async deleteWebhookMessage(id: string): Promise<void> {
    await this.storageAdapter.deleteMessage(id);
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats() {
    return await this.storageAdapter.getStats();
  }

  /**
   * Clean up old webhook messages
   */
  async cleanupOldMessages(olderThanDays: number): Promise<number> {
    return await this.storageAdapter.cleanupOldMessages(olderThanDays);
  }

  /**
   * Get storage health status
   */
  async getHealthStatus() {
    try {
      const storageHealth = await this.storageAdapter.getHealthStatus();
      const config = this.configManager.getStorageConfig();

      return {
        storage: {
          healthy: storageHealth.status === 'healthy',
          type: config.type,
          status: storageHealth.status,
          details: storageHealth.details,
          lastCheck: new Date(),
        },
        queue: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          isActive: true,
        },
        initialized: true,
      };
    } catch (error) {
      const config = this.configManager.getStorageConfig();
      return {
        storage: {
          healthy: false,
          type: config.type,
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date(),
        },
        queue: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          isActive: false,
        },
        initialized: false,
      };
    }
  }

  /**
   * Get batch processor statistics
   */
  async getBatchStats() {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      isActive: true,
    };
  }

  /**
   * Close the service and cleanup resources
   */
  async close(): Promise<void> {
    await this.storageAdapter.close();
    await StorageAdapterFactory.closeAllAdapters();
  }
}
