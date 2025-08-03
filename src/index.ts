import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';

import { ConfigManager } from './config/StorageConfig';
import { WebhookService } from './services/webhookService';
import { AuthService } from './services/authService';
import { DatabaseService } from './services/databaseService';
import { webhookRouter } from './routes/webhook';
import { apiRouter } from './routes/api';
import { authRouter } from './routes/auth';
import { setupWebSocket } from './websocket';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

// Initialize services
const configManager = new ConfigManager();
const databaseService = DatabaseService.getInstance();
const webhookService = WebhookService.getInstance();
const authService = AuthService.getInstance();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Setup WebSocket
setupWebSocket(wss);

// Middleware - 为HTTP环境完全禁用有问题的安全头
app.use(helmet({
  contentSecurityPolicy: false, // 完全禁用CSP以避免HTTP环境问题
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

app.use(morgan('combined'));

// 禁用缓存以避免304问题
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (for the web interface)
app.use('/dist', express.static(path.join(__dirname, '../public/dist')));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/webhook', webhookRouter);
app.use('/api', apiRouter);
app.use('/auth', authRouter);

// Serve the web interface
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Test page
app.get('/test', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/test.html'));
});

// Health check
app.get('/health', async (_req, res) => {
  try {
    const dbHealth = await databaseService.healthCheck();

    res.json({
      status: dbHealth.status === 'healthy' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'unhealthy',
        message: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;

// Initialize services and start server
async function startServer() {
  try {
    console.log('🗄️  Initializing database...');
    await databaseService.initialize();

    console.log('🔧 Initializing webhook service...');
    await webhookService.initialize();

    console.log('🔐 Initializing authentication service...');
    await authService.initialize();

    server.listen(PORT, () => {
      const storageConfig = configManager.getStorageConfig();
      const fallbackConfig = configManager.getFallbackStorageConfig();
      const queueConfig = configManager.getQueueConfig();

      console.log(`🚀 Webhook server is running on port ${PORT}`);
      console.log(`📊 Web interface: http://localhost:${PORT}`);
      console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook`);
      console.log(`📡 API endpoint: http://localhost:${PORT}/api`);

      if (fallbackConfig) {
        console.log(`💾 Storage: ${storageConfig.type} (primary) + ${fallbackConfig.type} (fallback)`);
      } else {
        console.log(`💾 Storage: ${storageConfig.type}`);
      }

      console.log(`🔄 Queue enabled: ${queueConfig.enabled}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);

  try {
    // Close webhook service
    await webhookService.close();

    // Close database service
    await databaseService.close();

    // Close server
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('⚠️ Forced shutdown');
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

export { wss };
