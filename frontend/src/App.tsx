import React from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { QueryClient, QueryClientProvider } from 'react-query';
import { WebhookDashboard } from '@/components/WebhookDashboard';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'antd/dist/reset.css';

// Configure dayjs
dayjs.extend(relativeTime);

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme}>
        <AntdApp>
          <div className="App">
            <WebhookDashboard />
          </div>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
