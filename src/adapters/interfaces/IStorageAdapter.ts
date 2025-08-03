import { WebhookMessage, WebhookQueryParams, WebhookListResponse } from '../../types/webhook';

export interface IStorageAdapter {
  /**
   * Initialize the storage adapter
   */
  initialize(): Promise<void>;

  /**
   * Store a webhook message
   */
  storeMessage(message: Omit<WebhookMessage, 'id' | 'receivedAt'>): Promise<WebhookMessage>;

  /**
   * Store multiple webhook messages in batch
   */
  storeMessages(messages: Omit<WebhookMessage, 'id' | 'receivedAt'>[]): Promise<WebhookMessage[]>;

  /**
   * Get webhook messages with pagination and filtering
   */
  getMessages(params: WebhookQueryParams): Promise<WebhookListResponse>;

  /**
   * Get a webhook message by ID
   */
  getMessageById(id: string): Promise<WebhookMessage | null>;

  /**
   * Update a webhook message
   */
  updateMessage(id: string, updates: Partial<WebhookMessage>): Promise<WebhookMessage>;

  /**
   * Delete a webhook message
   */
  deleteMessage(id: string): Promise<void>;

  /**
   * Get webhook statistics
   */
  getStats(): Promise<StorageStats>;

  /**
   * Search messages with advanced query
   */
  searchMessages(query: string, params?: WebhookQueryParams): Promise<WebhookListResponse>;

  /**
   * Clean up old messages
   */
  cleanupOldMessages(olderThanDays: number): Promise<number>;

  /**
   * Get health status of the storage
   */
  getHealthStatus(): Promise<StorageHealthStatus>;

  /**
   * Close the storage connection
   */
  close(): Promise<void>;
}

export interface StorageConfig {
  type: 'sqlite' | 'mysql' | 'postgresql' | 'elasticsearch';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
  timeout?: number;
  indexName?: string; // For Elasticsearch
  [key: string]: any;
}

export interface StorageStats {
  total: number;
  byType: Array<{ type: string; count: number }>;
  last24Hours: number;
}

export interface StorageHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: any;
}
