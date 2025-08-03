import * as Joi from 'joi';
import { StorageConfig } from '../adapters/interfaces/IStorageAdapter';

export interface QueueConfig {
  enabled: boolean;
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  batchSize: number;
  batchTimeout: number;
}

export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    origins: string[];
  };
}

export interface AppConfig {
  server: ServerConfig;
  storage: {
    primary: StorageConfig;
    fallback?: StorageConfig;
    enableFallback: boolean;
  };
  queue: QueueConfig;
}

const storageConfigSchema = Joi.object({
  type: Joi.string().valid('sqlite', 'mysql', 'postgresql', 'elasticsearch').required(),
  connectionString: Joi.string().optional(),
  host: Joi.string().when('type', {
    is: Joi.string().valid('mysql', 'postgresql', 'elasticsearch'),
    then: Joi.string().optional(),
    otherwise: Joi.string().optional().allow('', null)
  }),
  port: Joi.number().when('type', {
    is: Joi.string().valid('mysql', 'postgresql', 'elasticsearch'),
    then: Joi.number().optional(),
    otherwise: Joi.number().optional().allow(null)
  }),
  database: Joi.string().when('type', {
    is: Joi.string().valid('mysql', 'postgresql'),
    then: Joi.string().optional(),
    otherwise: Joi.string().optional().allow('', null)
  }),
  username: Joi.string().optional().allow('', null),
  password: Joi.string().optional().allow('', null),
  ssl: Joi.boolean().optional(),
  maxConnections: Joi.number().min(1).max(100).optional(),
  timeout: Joi.number().min(1000).optional(),
  indexName: Joi.string().optional(), // For Elasticsearch
});

const configSchema = Joi.object({
  server: Joi.object({
    port: Joi.number().min(1).max(65535).default(3000),
    host: Joi.string().default('0.0.0.0'),
    cors: Joi.object({
      origins: Joi.array().items(Joi.string()).default(['http://localhost:3000']),
    }).default(),
  }).default(),
  
  storage: Joi.object({
    primary: storageConfigSchema.required(),
    fallback: storageConfigSchema.optional(),
    enableFallback: Joi.boolean().default(false),
  }).required(),
  
  queue: Joi.object({
    enabled: Joi.boolean().default(false),
    redis: Joi.object({
      host: Joi.string().default('localhost'),
      port: Joi.number().default(6379),
      password: Joi.string().optional().allow('', null),
      db: Joi.number().default(0),
    }).optional(),
    batchSize: Joi.number().min(1).max(1000).default(100),
    batchTimeout: Joi.number().min(100).max(60000).default(5000),
  }).default(),
});

export class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): AppConfig {
    const config: AppConfig = {
      server: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || '0.0.0.0',
        cors: {
          origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        },
      },
      storage: {
        primary: this.parseStorageConfig('PRIMARY'),
        fallback: process.env.ENABLE_FALLBACK_STORAGE === 'true' 
          ? this.parseStorageConfig('FALLBACK') 
          : undefined,
        enableFallback: process.env.ENABLE_FALLBACK_STORAGE === 'true',
      },
      queue: {
        enabled: process.env.QUEUE_ENABLED === 'true',
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB || '0'),
        },
        batchSize: parseInt(process.env.QUEUE_BATCH_SIZE || '100'),
        batchTimeout: parseInt(process.env.QUEUE_BATCH_TIMEOUT || '5000'),
      },
    };

    return config;
  }

  private parseStorageConfig(prefix: string): StorageConfig {
    const type = process.env[`${prefix}_STORAGE_TYPE`] as StorageConfig['type'] || 'sqlite';
    
    const config: StorageConfig = {
      type,
      connectionString: process.env[`${prefix}_STORAGE_CONNECTION_STRING`] || 
                       process.env[`${prefix}_STORAGE_URL`] ||
                       (type === 'sqlite' ? 'file:./dev.db' : undefined),
      host: process.env[`${prefix}_STORAGE_HOST`],
      port: process.env[`${prefix}_STORAGE_PORT`] ?
            parseInt(process.env[`${prefix}_STORAGE_PORT`]!) : undefined,
      database: process.env[`${prefix}_STORAGE_DATABASE`],
      username: process.env[`${prefix}_STORAGE_USERNAME`],
      password: process.env[`${prefix}_STORAGE_PASSWORD`],
      ssl: process.env[`${prefix}_STORAGE_SSL`] === 'true',
      maxConnections: process.env[`${prefix}_STORAGE_MAX_CONNECTIONS`] ?
                     parseInt(process.env[`${prefix}_STORAGE_MAX_CONNECTIONS`]!) : 10,
      timeout: process.env[`${prefix}_STORAGE_TIMEOUT`] ?
              parseInt(process.env[`${prefix}_STORAGE_TIMEOUT`]!) : undefined,
    };

    // Elasticsearch specific
    if (type === 'elasticsearch') {
      config.indexName = process.env[`${prefix}_STORAGE_INDEX`] || 'webhook-messages';
    }

    return config;
  }

  private validateConfig(): void {
    const { error } = configSchema.validate(this.config, { allowUnknown: true });
    if (error) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public getStorageConfig(): StorageConfig {
    return this.config.storage.primary;
  }

  public getFallbackStorageConfig(): StorageConfig | undefined {
    return this.config.storage.enableFallback ? this.config.storage.fallback : undefined;
  }

  public getQueueConfig(): QueueConfig {
    return this.config.queue;
  }

  public getServerConfig(): ServerConfig {
    return this.config.server;
  }
}
