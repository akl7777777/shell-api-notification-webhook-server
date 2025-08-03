import { prisma } from '../database/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export class DatabaseService {
  private static instance: DatabaseService;
  private initialized = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * 初始化数据库，确保所有表都存在
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔄 Initializing database...');

      // 检查数据库连接
      await this.checkConnection();

      // 检查并创建必要的表
      await this.ensureTablesExist();

      this.initialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * 检查数据库连接
   */
  private async checkConnection(): Promise<void> {
    try {
      await prisma.$connect();
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * 确保所有必要的表都存在
   */
  private async ensureTablesExist(): Promise<void> {
    try {
      // 检查admins表是否存在
      const adminsTableExists = await this.checkTableExists('admins');
      
      if (!adminsTableExists) {
        console.log('⚠️  Admins table not found, initializing database schema...');
        await this.initializeSchema();
      } else {
        console.log('✅ All required tables exist');
      }
    } catch (error) {
      console.error('❌ Failed to check tables:', error);
      throw error;
    }
  }

  /**
   * 检查表是否存在
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      // 对于SQLite，检查sqlite_master表
      const result = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=${tableName}
      `;
      
      return result.length > 0;
    } catch (error) {
      console.error(`❌ Failed to check table ${tableName}:`, error);
      return false;
    }
  }

  /**
   * 初始化数据库schema
   */
  private async initializeSchema(): Promise<void> {
    try {
      console.log('📤 Pushing database schema...');
      
      // 使用Prisma CLI推送schema
      const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss', {
        cwd: process.cwd(),
        env: { ...process.env }
      });

      if (stderr && !stderr.includes('warnings')) {
        console.warn('⚠️  Schema push warnings:', stderr);
      }

      console.log('✅ Database schema pushed successfully');
      
      // 验证admins表是否创建成功
      const adminsTableExists = await this.checkTableExists('admins');
      if (!adminsTableExists) {
        throw new Error('Failed to create admins table');
      }
      
      console.log('✅ Admins table created successfully');
    } catch (error) {
      console.error('❌ Failed to initialize schema:', error);
      throw error;
    }
  }

  /**
   * 获取数据库统计信息
   */
  public async getStats(): Promise<{
    tablesCount: number;
    messagesCount: number;
    adminsCount: number;
  }> {
    try {
      // 获取表数量
      const tables = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `;

      // 获取消息数量
      const messagesCount = await prisma.webhookMessage.count();

      // 获取管理员数量
      const adminsCount = await prisma.admin.count();

      return {
        tablesCount: tables.length,
        messagesCount,
        adminsCount
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return {
        tablesCount: 0,
        messagesCount: 0,
        adminsCount: 0
      };
    }
  }

  /**
   * 健康检查
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    details?: any;
  }> {
    try {
      // 检查连接
      await prisma.$connect();
      
      // 检查关键表
      const adminsTableExists = await this.checkTableExists('admins');
      const messagesTableExists = await this.checkTableExists('webhook_messages');
      
      if (!adminsTableExists || !messagesTableExists) {
        return {
          status: 'unhealthy',
          message: 'Required tables missing',
          details: {
            adminsTable: adminsTableExists,
            messagesTable: messagesTableExists
          }
        };
      }

      const stats = await this.getStats();
      
      return {
        status: 'healthy',
        message: 'Database is healthy',
        details: stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 关闭数据库连接
   */
  public async close(): Promise<void> {
    try {
      await prisma.$disconnect();
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Failed to close database connection:', error);
    }
  }
}
