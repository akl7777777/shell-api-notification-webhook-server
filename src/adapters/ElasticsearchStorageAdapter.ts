import { Client } from '@elastic/elasticsearch';
import { IStorageAdapter, StorageConfig, StorageStats, StorageHealthStatus } from './interfaces/IStorageAdapter';
import { WebhookMessage, WebhookQueryParams, WebhookListResponse } from '../types/webhook';
import { v4 as uuidv4 } from 'uuid';

export class ElasticsearchStorageAdapter implements IStorageAdapter {
  private client: Client;
  private indexName: string;
  private initialized = false;

  constructor(private config: StorageConfig) {
    this.indexName = config.indexName || 'webhook-messages';
    
    this.client = new Client({
      node: config.connectionString || `http://${config.host || 'localhost'}:${config.port || 9200}`,
      auth: config.username && config.password ? {
        username: config.username,
        password: config.password,
      } : undefined,
      tls: config.ssl ? {
        rejectUnauthorized: false,
      } : undefined,
      requestTimeout: config.timeout || 30000,
      maxRetries: 3,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if index exists
      const exists = await this.client.indices.exists({
        index: this.indexName,
      });

      if (!exists) {
        await this.createIndex();
      }

      this.initialized = true;
      console.log(`✅ Elasticsearch storage initialized with index: ${this.indexName}`);
    } catch (error) {
      console.error('❌ Failed to initialize Elasticsearch storage:', error);
      throw error;
    }
  }

  private async createIndex(): Promise<void> {
    await this.client.indices.create({
      index: this.indexName,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        analysis: {
          analyzer: {
            webhook_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'stop'],
            },
          },
        },
      },
      mappings: {
        properties: {
          id: { type: 'keyword' },
          type: { type: 'keyword' },
          title: {
            type: 'text',
            analyzer: 'webhook_analyzer',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          content: {
            type: 'text',
            analyzer: 'webhook_analyzer'
          },
          values: { type: 'object', enabled: false },
          timestamp: { type: 'long' },
          receivedAt: { type: 'date' },
          userAgent: { type: 'text' },
          sourceIp: { type: 'ip' },
          signature: { type: 'keyword' },
          processed: { type: 'boolean' },
        },
      },
    });
  }

  async storeMessage(message: Omit<WebhookMessage, 'id' | 'receivedAt'>): Promise<WebhookMessage> {
    const id = uuidv4();
    const receivedAt = new Date();
    
    const doc = {
      id,
      ...message,
      receivedAt,
    };

    await this.client.index({
      index: this.indexName,
      id,
      document: doc,
      refresh: 'wait_for', // Ensure document is searchable immediately
    });

    return doc as WebhookMessage;
  }

  async storeMessages(messages: Omit<WebhookMessage, 'id' | 'receivedAt'>[]): Promise<WebhookMessage[]> {
    const body = [];
    const results: WebhookMessage[] = [];

    for (const message of messages) {
      const id = uuidv4();
      const receivedAt = new Date();
      const doc = { id, ...message, receivedAt };

      body.push({ index: { _index: this.indexName, _id: id } });
      body.push(doc);
      results.push(doc as WebhookMessage);
    }

    await this.client.bulk({
      operations: body,
      refresh: 'wait_for',
    });

    return results;
  }

  async getMessages(params: WebhookQueryParams = {}): Promise<WebhookListResponse> {
    const {
      page = 1,
      pageSize = 20,
      type,
      processed,
      search,
      startDate,
      endDate,
    } = params;

    const from = (page - 1) * pageSize;
    const size = pageSize;

    const query: any = {
      bool: {
        must: [],
        filter: [],
      },
    };

    if (type) {
      query.bool.filter.push({ term: { type } });
    }

    if (processed !== undefined) {
      query.bool.filter.push({ term: { processed } });
    }

    if (startDate || endDate) {
      const range: any = {};
      if (startDate) range.gte = startDate;
      if (endDate) range.lte = endDate;
      query.bool.filter.push({ range: { receivedAt: range } });
    }

    if (search) {
      query.bool.must.push({
        multi_match: {
          query: search,
          fields: ['title^2', 'content', 'type'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    const response = await this.client.search({
      index: this.indexName,
      query: query.bool.must.length === 0 && query.bool.filter.length === 0
        ? { match_all: {} }
        : query,
      sort: [{ receivedAt: { order: 'desc' } }],
      from,
      size,
    });

    const messages = response.hits.hits.map((hit: any) => hit._source);
    const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;

    return {
      messages,
      total,
      page,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    };
  }

  async getMessageById(id: string): Promise<WebhookMessage | null> {
    try {
      const response = await this.client.get({
        index: this.indexName,
        id,
      });

      return response._source as WebhookMessage;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async updateMessage(id: string, updates: Partial<WebhookMessage>): Promise<WebhookMessage> {
    await this.client.update({
      index: this.indexName,
      id,
      doc: updates,
      refresh: 'wait_for',
    });

    const updated = await this.getMessageById(id);
    if (!updated) {
      throw new Error(`Message with id ${id} not found after update`);
    }

    return updated;
  }

  async deleteMessage(id: string): Promise<void> {
    await this.client.delete({
      index: this.indexName,
      id,
      refresh: 'wait_for',
    });
  }

  async getStats(): Promise<StorageStats> {
    const response = await this.client.search({
      index: this.indexName,
      size: 0,
      aggs: {
        total: {
          value_count: { field: 'id' },
        },
        by_type: {
          terms: { field: 'type', size: 50 },
        },
        last_24_hours: {
          filter: {
            range: {
              receivedAt: {
                gte: 'now-24h',
              },
            },
          },
        },
      },
    });

    const aggs = response.aggregations;

    return {
      total: (aggs?.total as any)?.value || 0,
      byType: (aggs?.by_type as any)?.buckets?.map((bucket: any) => ({
        type: bucket.key,
        count: bucket.doc_count,
      })) || [],
      last24Hours: (aggs?.last_24_hours as any)?.doc_count || 0,
    };
  }

  async searchMessages(query: string, params?: WebhookQueryParams): Promise<WebhookListResponse> {
    return this.getMessages({
      ...params,
      search: query,
    });
  }

  async cleanupOldMessages(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const response = await this.client.deleteByQuery({
      index: this.indexName,
      query: {
        range: {
          receivedAt: {
            lt: cutoffDate.toISOString(),
          },
        },
      },
      refresh: true,
    });

    return response.deleted || 0;
  }

  async getHealthStatus(): Promise<StorageHealthStatus> {
    try {
      const health = await this.client.cluster.health({
        index: this.indexName,
      });

      const status = health.status;
      return {
        status: status === 'green' ? 'healthy' : status === 'yellow' ? 'degraded' : 'unhealthy',
        details: {
          cluster_status: status,
          number_of_nodes: health.number_of_nodes,
          active_shards: health.active_shards,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
