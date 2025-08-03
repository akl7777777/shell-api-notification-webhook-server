import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { WebhookMessage } from './types/webhook';

interface WebSocketClient {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
}

const clients = new Map<string, WebSocketClient>();

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req) => {
    const clientId = uuidv4();
    const client: WebSocketClient = {
      id: clientId,
      ws,
      isAlive: true,
    };

    clients.set(clientId, client);

    console.log(`WebSocket client connected: ${clientId} (${req.socket.remoteAddress})`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to webhook server',
      clientId,
      timestamp: new Date().toISOString(),
    }));

    // Handle pong responses
    ws.on('pong', () => {
      client.isAlive = true;
    });

    // Handle messages from client
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`Message from client ${clientId}:`, message);

        // Handle different message types
        switch (message.type) {
          case 'ping':
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString(),
            }));
            break;
          
          case 'subscribe':
            // Client can subscribe to specific notification types
            ws.send(JSON.stringify({
              type: 'subscribed',
              filters: message.filters || {},
              timestamp: new Date().toISOString(),
            }));
            break;

          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type',
              timestamp: new Date().toISOString(),
            }));
        }
      } catch (error) {
        console.error(`Error parsing message from client ${clientId}:`, error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid JSON message',
          timestamp: new Date().toISOString(),
        }));
      }
    });

    // Handle client disconnect
    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected: ${clientId} (code: ${code}, reason: ${reason})`);
      clients.delete(clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      clients.delete(clientId);
    });
  });

  // Heartbeat to detect broken connections
  const heartbeat = setInterval(() => {
    clients.forEach((client, clientId) => {
      if (!client.isAlive) {
        console.log(`Terminating inactive client: ${clientId}`);
        client.ws.terminate();
        clients.delete(clientId);
        return;
      }

      client.isAlive = false;
      client.ws.ping();
    });
  }, 30000); // Check every 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  console.log('WebSocket server setup complete');
}

/**
 * Broadcast webhook message to all connected clients
 */
export function broadcastWebhookMessage(message: WebhookMessage) {
  const payload = {
    type: 'webhook_message',
    data: {
      ...message,
      timestamp: Number(message.timestamp),
      values: message.values ? (typeof message.values === 'string' ? JSON.parse(message.values) : message.values) : null,
    },
    timestamp: new Date().toISOString(),
  };

  const messageStr = JSON.stringify(payload);
  let sentCount = 0;

  clients.forEach((client, clientId) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(messageStr);
        sentCount++;
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
        clients.delete(clientId);
      }
    }
  });

  console.log(`Broadcasted webhook message to ${sentCount} clients:`, {
    id: message.id,
    type: message.type,
    title: message.title,
  });
}

/**
 * Get connected clients count
 */
export function getConnectedClientsCount(): number {
  return clients.size;
}

/**
 * Send message to specific client
 */
export function sendToClient(clientId: string, message: any): boolean {
  const client = clients.get(clientId);
  if (!client || client.ws.readyState !== WebSocket.OPEN) {
    return false;
  }

  try {
    client.ws.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error(`Error sending message to client ${clientId}:`, error);
    clients.delete(clientId);
    return false;
  }
}
