import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';

// import { ConfigManager } from './config/StorageConfig';
import { WebhookService } from './services/webhookService';
import { webhookRouter } from './routes/webhook';
import { apiRouter } from './routes/api';
import { setupWebSocket } from './websocket';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

// Initialize services
const webhookService = WebhookService.getInstance();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Setup WebSocket
setupWebSocket(wss);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (for the web interface)
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/webhook', webhookRouter);
app.use('/api', apiRouter);

// Serve the web interface
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
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
    console.log('🔧 Initializing webhook service...');
    await webhookService.initialize();

    server.listen(PORT, () => {
      console.log(`🚀 Webhook server is running on port ${PORT}`);
      console.log(`📊 Web interface: http://localhost:${PORT}`);
      console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook`);
      console.log(`📡 API endpoint: http://localhost:${PORT}/api`);
      console.log(`💾 Storage type: SQLite`);
      console.log(`🔄 Queue enabled: false`);
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
