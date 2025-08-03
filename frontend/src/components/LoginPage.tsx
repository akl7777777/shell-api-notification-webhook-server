import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Alert, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { LoginRequest } from '../types/auth';

const { Title, Text } = Typography;

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [form] = Form.useForm();
  const { login, loading, error, clearError } = useAuthStore();
  const [loginAttempts, setLoginAttempts] = useState(0);

  useEffect(() => {
    // 清除之前的错误
    clearError();
  }, [clearError]);

  const handleSubmit = async (values: LoginRequest) => {
    try {
      const success = await login(values);
      
      if (success) {
        setLoginAttempts(0);
        onLoginSuccess?.();
      } else {
        setLoginAttempts(prev => prev + 1);
        // 如果登录失败，清空密码字段
        form.setFieldsValue({ password: '' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginAttempts(prev => prev + 1);
    }
  };

  const handleFormChange = () => {
    // 当用户开始输入时清除错误信息
    if (error) {
      clearError();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
        }}
        bodyStyle={{ padding: '40px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <LoginOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={2} style={{ margin: 0, color: '#262626' }}>
            管理员登录
          </Title>
          <Text type="secondary">
            Webhook Dashboard Admin Panel
          </Text>
        </div>

        {error && (
          <Alert
            message="登录失败"
            description={error}
            type="error"
            showIcon
            closable
            onClose={clearError}
            style={{ marginBottom: '24px' }}
          />
        )}

        {loginAttempts >= 3 && (
          <Alert
            message="多次登录失败"
            description="请检查您的用户名和密码是否正确"
            type="warning"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}

        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          onValuesChange={handleFormChange}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, message: '用户名至少2个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: '16px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: '44px', fontSize: '16px' }}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Space direction="vertical" size="small">
            <Text type="secondary" style={{ fontSize: '12px' }}>
              默认账户: admin / admin123
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              请在首次登录后修改密码
            </Text>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
