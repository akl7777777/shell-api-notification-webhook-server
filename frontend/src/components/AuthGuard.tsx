import React, { useEffect, useState } from 'react';
import { Spin, Result, Button } from 'antd';
import { LoadingOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import LoginPage from './LoginPage';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, loading, verifyToken, logout } = useAuthStore();
  const [initializing, setInitializing] = useState(true);
  const [verificationFailed, setVerificationFailed] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setInitializing(true);
        setVerificationFailed(false);

        // 尝试验证现有token
        const isValid = await verifyToken();
        
        if (!isValid) {
          setVerificationFailed(true);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setVerificationFailed(true);
      } finally {
        setInitializing(false);
      }
    };

    initializeAuth();
  }, [verifyToken]);

  const handleLoginSuccess = () => {
    setVerificationFailed(false);
  };

  const handleRetry = async () => {
    setInitializing(true);
    setVerificationFailed(false);
    
    try {
      const isValid = await verifyToken();
      if (!isValid) {
        setVerificationFailed(true);
      }
    } catch (error) {
      console.error('Retry verification error:', error);
      setVerificationFailed(true);
    } finally {
      setInitializing(false);
    }
  };

  const handleForceLogout = async () => {
    await logout();
    setVerificationFailed(false);
  };

  // 初始化加载中
  if (initializing || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Spin 
            indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
            size="large"
          />
          <div style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
            正在验证身份...
          </div>
        </div>
      </div>
    );
  }

  // 验证失败但有token的情况（可能是token过期）
  if (verificationFailed && !isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}>
        <Result
          icon={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
          title="身份验证失败"
          subTitle="您的登录状态已过期或无效，请重新登录"
          extra={[
            <Button type="primary" key="retry" onClick={handleRetry}>
              重试验证
            </Button>,
            <Button key="login" onClick={handleForceLogout}>
              重新登录
            </Button>,
          ]}
        />
      </div>
    );
  }

  // 未认证，显示登录页面
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 已认证，显示受保护的内容
  return <>{children}</>;
};

export default AuthGuard;
