import React, { useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Popconfirm,
  Tooltip,
  Badge,
  Typography,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  CheckOutlined,
  EyeOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useWebhooks } from '@/hooks/useWebhooks';
import type { WebhookMessage } from '@/types/webhook';
import { NotificationTypes } from '@/types/webhook';
import dayjs from 'dayjs';
import Highlighter from 'react-highlight-words';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface MessageListProps {
  onSelectMessage: (message: WebhookMessage) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ onSelectMessage }) => {
  const {
    messages,
    loading,
    filters,
    pagination,
    updateFilters,
    updatePagination,
    markAsProcessed,
    deleteMessage,
    searchMessages,
  } = useWebhooks();

  const [searchText, setSearchText] = useState('');

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

  const handleSearch = (value: string) => {
    setSearchText(value);
    if (value.trim()) {
      searchMessages(value);
    } else {
      updateFilters({ search: undefined });
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    updateFilters({ [key]: value });
  };

  const columns: ColumnsType<WebhookMessage> = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>
          {type.replace(/_/g, ' ').toUpperCase()}
        </Tag>
      ),
      filters: Object.values(NotificationTypes).map(type => ({
        text: type.replace(/_/g, ' ').toUpperCase(),
        value: type,
      })),
      filteredValue: filters.type ? [filters.type] : null,
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string) => (
        <Highlighter
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={title}
        />
      ),
    },
    {
      title: 'Content',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Text type="secondary" ellipsis>
          <Highlighter
            highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
            searchWords={[searchText]}
            autoEscape
            textToHighlight={content}
          />
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'processed',
      key: 'processed',
      width: 100,
      render: (processed: boolean) => (
        <Badge
          status={processed ? 'success' : 'processing'}
          text={processed ? 'Processed' : 'Pending'}
        />
      ),
      filters: [
        { text: 'Processed', value: true },
        { text: 'Pending', value: false },
      ],
      filteredValue: filters.processed !== undefined ? [filters.processed] : null,
      onFilter: (value, record) => record.processed === value,
    },
    {
      title: 'Received At',
      dataIndex: 'receivedAt',
      key: 'receivedAt',
      width: 180,
      render: (receivedAt: string) => (
        <Tooltip title={dayjs(receivedAt).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(receivedAt).fromNow()}
        </Tooltip>
      ),
      sorter: (a, b) => dayjs(a.receivedAt).unix() - dayjs(b.receivedAt).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onSelectMessage(record)}
            />
          </Tooltip>
          {!record.processed && (
            <Tooltip title="Mark as Processed">
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => markAsProcessed(record.id)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Are you sure you want to delete this message?"
            onConfirm={() => deleteMessage(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Filters */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Search messages..."
          allowClear
          enterButton={<SearchOutlined />}
          onSearch={handleSearch}
          style={{ width: 300 }}
        />
        <Select
          placeholder="Filter by type"
          allowClear
          style={{ width: 200 }}
          value={filters.type}
          onChange={(value) => handleFilterChange('type', value)}
        >
          {Object.values(NotificationTypes).map(type => (
            <Select.Option key={type} value={type}>
              {type.replace(/_/g, ' ').toUpperCase()}
            </Select.Option>
          ))}
        </Select>
      </Space>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={messages}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} messages`,
          onChange: updatePagination,
          onShowSizeChange: updatePagination,
        }}
        scroll={{ x: 800 }}
        size="small"
      />
    </div>
  );
};
