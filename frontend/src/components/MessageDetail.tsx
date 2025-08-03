import React from 'react';
import {
  Descriptions,
  Tag,
  Typography,
  Space,
  Button,
  Badge,
  Card,
  Divider,
  Alert,
  Tooltip,
} from 'antd';
import {
  CheckOutlined,
  CopyOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useWebhooks } from '@/hooks/useWebhooks';
import type { WebhookMessage } from '@/types/webhook';
import { NotificationTypes } from '@/types/webhook';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface MessageDetailProps {
  message: WebhookMessage;
}

export const MessageDetail: React.FC<MessageDetailProps> = ({ message }) => {
  const { markAsProcessed } = useWebhooks();

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      [NotificationTypes.QUOTA_EXCEED]: 'red',
      [NotificationTypes.BALANCE_LOW]: 'orange',
      [NotificationTypes.SECURITY_ALERT]: 'red',
      [NotificationTypes.SYSTEM_ANNOUNCEMENT]: 'blue',
      [NotificationTypes.CHANNEL_UPDATE]: 'green',
      [NotificationTypes.CHANNEL_TEST]: 'cyan',
      [NotificationTypes.PROMOTIONAL_ACTIVITY]: 'purple',
      [NotificationTypes.MODEL_PRICING_UPDATE]: 'geekblue',
      [NotificationTypes.ANTI_LOSS_CONTACT]: 'magenta',
      [NotificationTypes.TEST]: 'default',
    };
    return colors[type] || 'default';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTimestamp = (timestamp: number) => {
    return dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm:ss');
  };

  return (
    <div>
      {/* Header */}
      <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tag color={getTypeColor(message.type)} style={{ fontSize: 14, padding: '4px 8px' }}>
            {message.type.replace(/_/g, ' ').toUpperCase()}
          </Tag>
          {!message.processed && (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => markAsProcessed(message.id)}
            >
              Mark as Processed
            </Button>
          )}
        </div>
        
        <Typography.Title level={4} style={{ margin: 0 }}>
          {message.title}
        </Typography.Title>
        
        <Badge
          status={message.processed ? 'success' : 'processing'}
          text={message.processed ? 'Processed' : 'Pending'}
        />
      </Space>

      <Divider />

      {/* Content */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Typography.Title level={5}>Content</Typography.Title>
        <Paragraph
          copyable={{
            icon: <CopyOutlined />,
            tooltips: ['Copy content', 'Copied!'],
          }}
        >
          {message.content}
        </Paragraph>
      </Card>

      {/* Values */}
      {message.values && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Typography.Title level={5}>Values</Typography.Title>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: 12, 
            borderRadius: 4,
            fontSize: 12,
            overflow: 'auto'
          }}>
            {JSON.stringify(message.values, null, 2)}
          </pre>
        </Card>
      )}

      {/* Details */}
      <Descriptions
        title="Message Details"
        size="small"
        column={1}
        bordered
      >
        <Descriptions.Item 
          label={
            <Space>
              <SafetyCertificateOutlined />
              Message ID
            </Space>
          }
        >
          <Text code copyable={{ text: message.id }}>
            {message.id}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item 
          label={
            <Space>
              <ClockCircleOutlined />
              Original Timestamp
            </Space>
          }
        >
          <Tooltip title={`Unix timestamp: ${message.timestamp}`}>
            {formatTimestamp(message.timestamp)}
          </Tooltip>
        </Descriptions.Item>

        <Descriptions.Item 
          label={
            <Space>
              <ClockCircleOutlined />
              Received At
            </Space>
          }
        >
          <Tooltip title={dayjs(message.receivedAt).format('YYYY-MM-DD HH:mm:ss.SSS')}>
            {dayjs(message.receivedAt).fromNow()}
          </Tooltip>
        </Descriptions.Item>

        {message.sourceIp && (
          <Descriptions.Item 
            label={
              <Space>
                <GlobalOutlined />
                Source IP
              </Space>
            }
          >
            <Text code>{message.sourceIp}</Text>
          </Descriptions.Item>
        )}

        {message.userAgent && (
          <Descriptions.Item 
            label={
              <Space>
                <UserOutlined />
                User Agent
              </Space>
            }
          >
            <Text ellipsis style={{ maxWidth: 300 }} title={message.userAgent}>
              {message.userAgent}
            </Text>
          </Descriptions.Item>
        )}

        {message.signature && (
          <Descriptions.Item 
            label={
              <Space>
                <SafetyCertificateOutlined />
                Signature
              </Space>
            }
          >
            <Text code ellipsis style={{ maxWidth: 200 }} title={message.signature}>
              {message.signature}
            </Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* Processing Status */}
      {message.processed ? (
        <Alert
          message="Message Processed"
          description="This message has been marked as processed and handled."
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      ) : (
        <Alert
          message="Pending Processing"
          description="This message is waiting to be processed."
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};
