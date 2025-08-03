// Webhook payload structure based on your existing implementation
export interface WebhookPayload {
  type: string;           // 通知类型
  title: string;          // 通知标题
  content: string;        // 通知内容
  values?: any[];         // 占位符值数组
  timestamp: number;      // Unix时间戳
}

// Extended webhook payload with additional metadata
export interface WebhookRequest extends WebhookPayload {
  userAgent?: string;
  sourceIp?: string;
  signature?: string;
}

// Database model interface
export interface WebhookMessage {
  id: string;
  type: string;
  title: string;
  content: string;
  values?: any;           // Parsed values
  timestamp: number;      // Unix timestamp as number
  receivedAt: Date;
  userAgent?: string;
  sourceIp?: string;
  signature?: string;
  processed: boolean;
}

// API response interfaces
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

// Notification types constants (matching your existing implementation)
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
