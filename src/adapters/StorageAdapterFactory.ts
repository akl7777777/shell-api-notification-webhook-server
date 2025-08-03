import { IStorageAdapter, StorageConfig } from './interfaces/IStorageAdapter';
import { PrismaStorageAdapter } from './PrismaStorageAdapter';
import { ElasticsearchStorageAdapter } from './ElasticsearchStorageAdapter';
import { WebhookMessage, WebhookQueryParams, WebhookListResponse } from '../types/webhook';

export class FallbackStorageAdapter implements IStorageAdapter {
  constructor(
    private primaryAdapter: IStorageAdapter,
    private fallbackAdapter: IStorageAdapter
  ) {}

  async initialize(): Promise<void> {
    await Promise.all([
      this.primaryAdapter.initialize(),
      this.fallbackAdapter.initialize(),
    ]);
  }

  async storeMessage(message: Omit<WebhookMessage, 'id' | 'receivedAt'>): Promise<WebhookMessage> {
    try {
      return await this.primaryAdapter.storeMessage(message);
    } catch (error) {
      console.warn('Primary storage failed, using fallback:', error);
      return await this.fallbackAdapter.storeMessage(message);
    }
  }

  async storeMessages(messages: Omit<WebhookMessage, 'id' | 'receivedAt'>[]): Promise<WebhookMessage[]> {
    try {
      return await this.primaryAdapter.storeMessages(messages);
    } catch (error) {
      console.warn('Primary storage failed, using fallback:', error);
      return await this.fallbackAdapter.storeMessages(messages);
    }
  }

  async getMessages(params: WebhookQueryParams): Promise<WebhookListResponse> {
    try {
      return await this.primaryAdapter.getMessages(params);
    } catch (error) {
      console.warn('Primary storage failed, using fallback:', error);
      return await this.fallbackAdapter.getMessages(params);
    }
  }

  async getMessageById(id: string): Promise<WebhookMessage | null> {
    try {
      return await this.primaryAdapter.getMessageById(id);
    } catch (error) {
      console.warn('Primary storage failed, using fallback:', error);
      return await this.fallbackAdapter.getMessageById(id);
    }
  }

  async updateMessage(id: string, updates: Partial<WebhookMessage>): Promise<WebhookMessage> {
    try {
      return await this.primaryAdapter.updateMessage(id, updates);
    } catch (error) {
      console.warn('Primary storage failed, using fallback:', error);
      return await this.fallbackAdapter.updateMessage(id, updates);
    }
  }

  async deleteMessage(id: string): Promise<void> {
    try {
      await this.primaryAdapter.deleteMessage(id);
    } catch (error) {
      console.warn('Primary storage failed, using fallback:', error);
      await this.fallbackAdapter.deleteMessage(id);
    }
  }

  async getStats() {
    try {
      return await this.primaryAdapter.getStats();
    } catch (error) {
      console.warn('Primary storage failed, using fallback:', error);
      return await this.fallbackAdapter.getStats();
    }
  }

  async searchMessages(query: string, params?: WebhookQueryParams): Promise<WebhookListResponse> {
    try {
      return await this.primaryAdapter.searchMessages(query, params);
    } catch (error) {
      console.warn('Primary storage failed, using fallback:', error);
      return await this.fallbackAdapter.searchMessages(query, params);
    }
  }

  async cleanupOldMessages(olderThanDays: number): Promise<number> {
    try {
      return await this.primaryAdapter.cleanupOldMessages(olderThanDays);
    } catch (error) {
      console.warn('Primary storage failed, using fallback:', error);
      return await this.fallbackAdapter.cleanupOldMessages(olderThanDays);
    }
  }

  async getHealthStatus() {
    const [primaryHealth, fallbackHealth] = await Promise.allSettled([
      this.primaryAdapter.getHealthStatus(),
      this.fallbackAdapter.getHealthStatus(),
    ]);

    return {
      status: 'healthy' as const,
      details: {
        primary: primaryHealth.status === 'fulfilled' ? primaryHealth.value : { error: primaryHealth.reason },
        fallback: fallbackHealth.status === 'fulfilled' ? fallbackHealth.value : { error: fallbackHealth.reason },
      },
    };
  }

  async close(): Promise<void> {
    await Promise.all([
      this.primaryAdapter.close(),
      this.fallbackAdapter.close(),
    ]);
  }
}

export class StorageAdapterFactory {
  private static adapters = new Map<string, IStorageAdapter>();

  static async createAdapter(config: StorageConfig): Promise<IStorageAdapter> {
    const key = JSON.stringify(config);
    
    if (this.adapters.has(key)) {
      return this.adapters.get(key)!;
    }

    let adapter: IStorageAdapter;

    switch (config.type) {
      case 'sqlite':
      case 'postgresql':
      case 'mysql':
        adapter = new PrismaStorageAdapter();
        break;
      
      case 'elasticsearch':
        adapter = new ElasticsearchStorageAdapter(config);
        break;
      
      default:
        throw new Error(`Unsupported storage type: ${config.type}`);
    }

    await adapter.initialize();
    this.adapters.set(key, adapter);
    return adapter;
  }

  static async createFallbackAdapter(
    primaryConfig: StorageConfig,
    fallbackConfig: StorageConfig
  ): Promise<FallbackStorageAdapter> {
    const [primaryAdapter, fallbackAdapter] = await Promise.all([
      this.createAdapter(primaryConfig),
      this.createAdapter(fallbackConfig),
    ]);

    return new FallbackStorageAdapter(primaryAdapter, fallbackAdapter);
  }

  static async closeAllAdapters(): Promise<void> {
    const closePromises = Array.from(this.adapters.values()).map(adapter => 
      adapter.close().catch(error => console.error('Error closing adapter:', error))
    );
    
    await Promise.all(closePromises);
    this.adapters.clear();
  }
}
