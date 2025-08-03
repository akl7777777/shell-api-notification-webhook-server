import { IStorageAdapter, StorageStats, StorageHealthStatus } from './interfaces/IStorageAdapter';
import { WebhookMessage, WebhookQueryParams, WebhookListResponse } from '../types/webhook';
import { prisma } from '../database/client';

export class PrismaStorageAdapter implements IStorageAdapter {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Test the connection
      await prisma.$connect();
      this.initialized = true;
      console.log('✅ Prisma storage initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Prisma storage:', error);
      throw error;
    }
  }

  async storeMessage(messageData: Omit<WebhookMessage, 'id' | 'receivedAt'>): Promise<WebhookMessage> {
    const message = await prisma.webhookMessage.create({
      data: {
        type: messageData.type,
        title: messageData.title,
        content: messageData.content,
        values: messageData.values ? JSON.stringify(messageData.values) : null,
        timestamp: BigInt(messageData.timestamp),
        userAgent: messageData.userAgent,
        sourceIp: messageData.sourceIp,
        signature: messageData.signature,
        processed: messageData.processed || false,
      },
    });

    return {
      ...message,
      timestamp: Number(message.timestamp),
      values: message.values ? JSON.parse(message.values) : null,
      userAgent: message.userAgent || undefined,
      sourceIp: message.sourceIp || undefined,
      signature: message.signature || undefined,
    };
  }

  async storeMessages(messagesData: Omit<WebhookMessage, 'id' | 'receivedAt'>[]): Promise<WebhookMessage[]> {
    const data = messagesData.map(messageData => ({
      type: messageData.type,
      title: messageData.title,
      content: messageData.content,
      values: messageData.values ? JSON.stringify(messageData.values) : null,
      timestamp: BigInt(messageData.timestamp),
      userAgent: messageData.userAgent,
      sourceIp: messageData.sourceIp,
      signature: messageData.signature,
      processed: messageData.processed || false,
    }));

    const messages = await prisma.webhookMessage.createMany({
      data,
    });

    // Return the created messages (note: createMany doesn't return the created records)
    // So we need to fetch them separately
    const createdMessages = await prisma.webhookMessage.findMany({
      orderBy: { receivedAt: 'desc' },
      take: messages.count,
    });

    return createdMessages.map(message => ({
      ...message,
      timestamp: Number(message.timestamp),
      values: message.values ? JSON.parse(message.values) : null,
      userAgent: message.userAgent || undefined,
      sourceIp: message.sourceIp || undefined,
      signature: message.signature || undefined,
    }));
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

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (processed !== undefined) {
      where.processed = processed;
    }

    if (startDate || endDate) {
      where.receivedAt = {};
      if (startDate) where.receivedAt.gte = new Date(startDate);
      if (endDate) where.receivedAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [messages, total] = await Promise.all([
      prisma.webhookMessage.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take,
      }),
      prisma.webhookMessage.count({ where }),
    ]);

    return {
      messages: messages.map(message => ({
        ...message,
        timestamp: Number(message.timestamp),
        values: message.values ? JSON.parse(message.values) : null,
        userAgent: message.userAgent || undefined,
        sourceIp: message.sourceIp || undefined,
        signature: message.signature || undefined,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getMessageById(id: string): Promise<WebhookMessage | null> {
    const message = await prisma.webhookMessage.findUnique({
      where: { id },
    });

    if (!message) return null;

    return {
      ...message,
      timestamp: Number(message.timestamp),
      values: message.values ? JSON.parse(message.values) : null,
      userAgent: message.userAgent || undefined,
      sourceIp: message.sourceIp || undefined,
      signature: message.signature || undefined,
    };
  }

  async updateMessage(id: string, updates: Partial<WebhookMessage>): Promise<WebhookMessage> {
    const updateData: any = { ...updates };
    
    if (updateData.values) {
      updateData.values = JSON.stringify(updateData.values);
    }
    
    if (updateData.timestamp) {
      updateData.timestamp = BigInt(updateData.timestamp);
    }

    const message = await prisma.webhookMessage.update({
      where: { id },
      data: updateData,
    });

    return {
      ...message,
      timestamp: Number(message.timestamp),
      values: message.values ? JSON.parse(message.values) : null,
      userAgent: message.userAgent || undefined,
      sourceIp: message.sourceIp || undefined,
      signature: message.signature || undefined,
    };
  }

  async deleteMessage(id: string): Promise<void> {
    await prisma.webhookMessage.delete({
      where: { id },
    });
  }

  async getStats(): Promise<StorageStats> {
    const [total, byType, last24Hours] = await Promise.all([
      prisma.webhookMessage.count(),
      prisma.webhookMessage.groupBy({
        by: ['type'],
        _count: { type: true },
        orderBy: { _count: { type: 'desc' } },
      }),
      prisma.webhookMessage.count({
        where: {
          receivedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      total,
      byType: byType.map(item => ({
        type: item.type,
        count: item._count.type,
      })),
      last24Hours,
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

    const result = await prisma.webhookMessage.deleteMany({
      where: {
        receivedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  async getHealthStatus(): Promise<StorageHealthStatus> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        details: { connection: 'active' },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }

  async close(): Promise<void> {
    await prisma.$disconnect();
  }
}
