import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert, Typography, Space } from 'antd';
import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { ChangePasswordRequest } from '../types/auth';

const { Text } = Typography;

interface ChangePasswordModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { changePassword, loading, error, clearError } = useAuthStore();
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (values: ChangePasswordRequest & { confirmPassword: string }) => {
    try {
      setLocalError(null);
      clearError();

      // 验证新密码确认
      if (values.newPassword !== values.confirmPassword) {
        setLocalError('新密码和确认密码不匹配');
        return;
      }

      const result = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (result) {
        setSuccess(true);
        form.resetFields();
        
        // 显示成功消息后关闭弹窗
        setTimeout(() => {
          setSuccess(false);
          onSuccess?.();
          onCancel();
        }, 1500);
      }
    } catch (error) {
      console.error('Change password error:', error);
      setLocalError('修改密码时发生错误');
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setLocalError(null);
    setSuccess(false);
    clearError();
    onCancel();
  };

  const validatePassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请输入新密码'));
    }
    if (value.length < 6) {
      return Promise.reject(new Error('密码至少6个字符'));
    }
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
      return Promise.reject(new Error('密码必须包含字母和数字'));
    }
    return Promise.resolve();
  };

  const displayError = localError || error;

  return (
    <Modal
      title={
        <Space>
          <LockOutlined />
          修改密码
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={480}
      destroyOnClose
    >
      {success && (
        <Alert
          message="密码修改成功"
          description="您的密码已成功更新"
          type="success"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {displayError && !success && (
        <Alert
          message="修改失败"
          description={displayError}
          type="error"
          showIcon
          closable
          onClose={() => {
            setLocalError(null);
            clearError();
          }}
          style={{ marginBottom: 24 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={loading || success}
        autoComplete="off"
      >
        <Form.Item
          name="currentPassword"
          label="当前密码"
          rules={[
            { required: true, message: '请输入当前密码' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入当前密码"
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[
            { validator: validatePassword },
          ]}
        >
          <Input.Password
            prefix={<SafetyCertificateOutlined />}
            placeholder="请输入新密码"
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认新密码"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<SafetyCertificateOutlined />}
            placeholder="请再次输入新密码"
            autoComplete="new-password"
          />
        </Form.Item>

        <div style={{ marginTop: 24 }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              密码要求：
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              • 至少6个字符
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              • 必须包含字母和数字
            </Text>
          </Space>
        </div>

        <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel} disabled={loading}>
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={success}
            >
              {loading ? '修改中...' : '确认修改'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
