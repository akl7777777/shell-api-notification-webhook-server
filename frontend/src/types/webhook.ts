// Webhook message types
export interface WebhookMessage {
  id: string;
  type: string;
  title: string;
  content: string;
  values?: any;
  timestamp: number;
  receivedAt: string;
  userAgent?: string;
  sourceIp?: string;
  signature?: string;
  processed: boolean;
}

// API response types
export interface WebhookListResponse {
  messages: WebhookMessage[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WebhookQueryParams {
  page?: number;
  pageSize?: number;
  type?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  processed?: boolean;
}

// Statistics types
export interface WebhookStats {
  total: number;
  byType: Array<{ type: string; count: number }>;
  last24Hours: number;
}

export interface StorageHealthStatus {
  healthy: boolean;
  type: string;
  status: string;
  details?: any;
  message?: string;
  lastCheck: string;
}

export interface HealthStatus {
  storage: StorageHealthStatus;
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    isActive: boolean;
  };
  initialized: boolean;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'webhook_message' | 'connection' | 'error';
  data?: WebhookMessage;
  message?: string;
  timestamp: string;
}

// Notification types
export const NotificationTypes = {
  QUOTA_EXCEED: 'quota_exceed',
  CHANNEL_UPDATE: 'channel_update',
  CHANNEL_TEST: 'channel_test',
  BALANCE_LOW: 'balance_low',
  SECURITY_ALERT: 'security_alert',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  PROMOTIONAL_ACTIVITY: 'promotional_activity',
  MODEL_PRICING_UPDATE: 'model_pricing_update',
  ANTI_LOSS_CONTACT: 'anti_loss_contact',
  TEST: 'test'
} as const;

export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes];

// UI state types
export interface FilterState {
  type?: string;
  processed?: boolean;
  dateRange?: [string, string];
  search?: string;
}

export interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}
