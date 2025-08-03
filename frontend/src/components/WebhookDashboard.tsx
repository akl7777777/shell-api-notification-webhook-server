import React, { useState } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Statistic,
  Badge,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  Spin,
  Dropdown,
  Avatar,
} from 'antd';
import {
  MessageOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  WifiOutlined,
  DisconnectOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { MessageList } from './MessageList';
import { MessageDetail } from './MessageDetail';
import { StatisticsChart } from './StatisticsChart';
import ChangePasswordModal from './ChangePasswordModal';
import { useWebhooks } from '@/hooks/useWebhooks';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export const WebhookDashboard: React.FC = () => {
  const {
    stats,
    health,
    loading,
    error,
    selectedMessage,
    wsStatus,
    loadMessages,
    loadStats,
    loadHealth,
    setSelectedMessage,
  } = useWebhooks();

  const { user, logout } = useAuthStore();
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);

  const handleRefresh = async () => {
    await Promise.all([loadMessages(), loadStats(), loadHealth()]);
  };

  const handleLogout = async () => {
    await logout();
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: `用户: ${user?.username}`,
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'change-password',
      icon: <LockOutlined />,
      label: '修改密码',
      onClick: () => setChangePasswordVisible(true),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      onClick: handleLogout,
    },
  ];

  const getWsStatusColor = () => {
    switch (wsStatus) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'processing';
      case 'disconnected':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getWsStatusIcon = () => {
    switch (wsStatus) {
      case 'connected':
        return <WifiOutlined />;
      case 'connecting':
        return <Spin size="small" />;
      case 'disconnected':
      case 'error':
        return <DisconnectOutlined />;
      default:
        return <DisconnectOutlined />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            <MessageOutlined style={{ marginRight: 8 }} />
            Webhook Dashboard
          </Title>
        </div>
        <Space>
          <Badge status={getWsStatusColor()} text={
            <Text style={{ color: 'white' }}>
              {getWsStatusIcon()} {wsStatus.toUpperCase()}
            </Text>
          } />
          <Button
            type="primary"
            ghost
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button
              type="primary"
              ghost
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 12px',
              }}
            >
              <Avatar
                size="small"
                icon={<UserOutlined />}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: 'white' }}>
                {user?.username}
              </Text>
            </Button>
          </Dropdown>
        </Space>
      </Header>

      <Layout>
        <Content style={{ padding: '24px' }}>
          {error && (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              closable
              style={{ marginBottom: 24 }}
            />
          )}

          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Messages"
                  value={stats?.total || 0}
                  prefix={<MessageOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Last 24 Hours"
                  value={stats?.last24Hours || 0}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Storage Status"
                  value={health?.storage.healthy ? 'Healthy' : 'Unhealthy'}
                  prefix={<DatabaseOutlined />}
                  valueStyle={{ 
                    color: health?.storage.healthy ? '#52c41a' : '#ff4d4f' 
                  }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {health?.storage.type?.toUpperCase()}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Last Check"
                  value={health?.storage.lastCheck ? 
                    dayjs(health.storage.lastCheck).format('HH:mm:ss') : 
                    'N/A'
                  }
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Charts */}
          {stats && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col span={24}>
                <Card title="Message Statistics">
                  <StatisticsChart data={stats} />
                </Card>
              </Col>
            </Row>
          )}

          {/* Main Content */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={selectedMessage ? 12 : 24}>
              <Card 
                title="Recent Messages" 
                extra={
                  <Text type="secondary">
                    Real-time updates enabled
                  </Text>
                }
              >
                <MessageList onSelectMessage={setSelectedMessage} />
              </Card>
            </Col>
            
            {selectedMessage && (
              <Col xs={24} lg={12}>
                <Card 
                  title="Message Details"
                  extra={
                    <Button 
                      type="text" 
                      onClick={() => setSelectedMessage(null)}
                    >
                      ×
                    </Button>
                  }
                >
                  <MessageDetail message={selectedMessage} />
                </Card>
              </Col>
            )}
          </Row>
        </Content>
      </Layout>

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={changePasswordVisible}
        onCancel={() => setChangePasswordVisible(false)}
        onSuccess={() => {
          // 可以在这里添加成功后的处理逻辑
          console.log('Password changed successfully');
        }}
      />
    </Layout>
  );
};
