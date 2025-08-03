import axios from 'axios';
import type {
  WebhookMessage,
  WebhookListResponse,
  WebhookQueryParams,
  WebhookStats,
  HealthStatus,
} from '@/types/webhook';

// Create axios instance
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// API methods
export const webhookApi = {
  // Get webhook messages with pagination and filtering
  getMessages: async (params: WebhookQueryParams = {}): Promise<WebhookListResponse> => {
    const response = await api.get('/api/webhooks', { params });
    return response.data.data;
  },

  // Get webhook message by ID
  getMessageById: async (id: string): Promise<WebhookMessage> => {
    const response = await api.get(`/api/webhooks/${id}`);
    return response.data.data;
  },

  // Mark message as processed
  markAsProcessed: async (id: string): Promise<WebhookMessage> => {
    const response = await api.put(`/api/webhooks/${id}/processed`);
    return response.data.data;
  },

  // Update message
  updateMessage: async (id: string, updates: Partial<WebhookMessage>): Promise<WebhookMessage> => {
    const response = await api.put(`/api/webhooks/${id}`, updates);
    return response.data.data;
  },

  // Delete message
  deleteMessage: async (id: string): Promise<void> => {
    await api.delete(`/api/webhooks/${id}`);
  },

  // Search messages
  searchMessages: async (query: string, params: WebhookQueryParams = {}): Promise<WebhookListResponse> => {
    const response = await api.get('/api/webhooks/search', {
      params: { q: query, ...params },
    });
    return response.data.data;
  },

  // Get statistics
  getStats: async (): Promise<WebhookStats> => {
    const response = await api.get('/api/webhooks/stats');
    return response.data.data;
  },

  // Get health status
  getHealth: async (): Promise<HealthStatus> => {
    const response = await api.get('/api/storage/health');
    return response.data.data;
  },

  // Cleanup old messages
  cleanupOldMessages: async (olderThanDays: number): Promise<{ deletedCount: number }> => {
    const response = await api.delete('/api/webhooks/cleanup', {
      params: { olderThanDays },
    });
    return response.data.data;
  },
};

export default api;
