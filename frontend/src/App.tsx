import React from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { WebhookDashboard } from '@/components/WebhookDashboard';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Configure dayjs
dayjs.extend(relativeTime);

// Ant Design theme configuration
const theme = {
  token: {
    colorPrimary: '#667eea',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#f5222d',
    colorInfo: '#1890ff',
    borderRadius: 8,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    Card: {
      borderRadiusLG: 12,
    },
    Button: {
      borderRadius: 6,
    },
    Table: {
      borderRadiusLG: 8,
    },
  },
};

const App: React.FC = () => {
  return (
    <ConfigProvider theme={theme}>
      <AntdApp>
        <div className="App">
          <WebhookDashboard />
        </div>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
