import { useEffect, useCallback } from 'react';
import { message } from 'antd';
import { useWebhookStore } from './useWebhookStore';
import { webhookApi } from '@/services/api';
import { websocketService } from '@/services/websocket';
import type { WebhookQueryParams } from '@/types/webhook';

export const useWebhooks = () => {
  const {
    messages,
    selectedMessage,
    stats,
    health,
    loading,
    error,
    filters,
    pagination,
    wsStatus,
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    setSelectedMessage,
    setStats,
    setHealth,
    setLoading,
    setError,
    setFilters,
    setPagination,
    setWsStatus,
  } = useWebhookStore();

  // Load messages with current filters and pagination
  const loadMessages = useCallback(async (params?: Partial<WebhookQueryParams>) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams: WebhookQueryParams = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
        ...params,
      };

      const response = await webhookApi.getMessages(queryParams);
      setMessages(response.messages);
      setPagination({
        current: response.page,
        pageSize: response.pageSize,
        total: response.total,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.current, pagination.pageSize, setMessages, setPagination, setLoading, setError]);

  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      const statsData = await webhookApi.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [setStats]);

  // Load health status
  const loadHealth = useCallback(async () => {
    try {
      const healthData = await webhookApi.getHealth();
      setHealth(healthData);
    } catch (err) {
      console.error('Failed to load health:', err);
    }
  }, [setHealth]);

  // Mark message as processed
  const markAsProcessed = useCallback(async (id: string) => {
    try {
      const updatedMessage = await webhookApi.markAsProcessed(id);
      updateMessage(id, updatedMessage);
      message.success('Message marked as processed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark as processed';
      message.error(errorMessage);
    }
  }, [updateMessage]);

  // Delete message
  const deleteMessage = useCallback(async (id: string) => {
    try {
      await webhookApi.deleteMessage(id);
      removeMessage(id);
      message.success('Message deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete message';
      message.error(errorMessage);
    }
  }, [removeMessage]);

  // Search messages
  const searchMessages = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await webhookApi.searchMessages(query, {
        page: 1,
        pageSize: pagination.pageSize,
        ...filters,
      });

      setMessages(response.messages);
      setPagination({
        current: 1,
        pageSize: response.pageSize,
        total: response.total,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.pageSize, setMessages, setPagination, setLoading, setError]);

  // Cleanup old messages
  const cleanupOldMessages = useCallback(async (olderThanDays: number) => {
    try {
      const result = await webhookApi.cleanupOldMessages(olderThanDays);
      message.success(`Deleted ${result.deletedCount} old messages`);
      loadMessages();
      loadStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Cleanup failed';
      message.error(errorMessage);
    }
  }, [loadMessages, loadStats]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(newFilters);
    setPagination({ current: 1 }); // Reset to first page when filters change
  }, [setFilters, setPagination]);

  // Update pagination
  const updatePagination = useCallback((page: number, pageSize?: number) => {
    setPagination({ current: page, pageSize: pageSize || pagination.pageSize });
  }, [setPagination, pagination.pageSize]);

  // Initialize WebSocket connection
  useEffect(() => {
    const unsubscribeMessage = websocketService.onMessage((message) => {
      addMessage(message);
    });

    const unsubscribeStatus = websocketService.onStatusChange((status) => {
      setWsStatus(status);
    });

    return () => {
      unsubscribeMessage();
      unsubscribeStatus();
    };
  }, [addMessage, setWsStatus]);

  // Load initial data
  useEffect(() => {
    loadMessages();
    loadStats();
    loadHealth();
  }, []);

  // Reload messages when filters or pagination change
  useEffect(() => {
    loadMessages();
  }, [filters, pagination.current, pagination.pageSize]);

  return {
    // State
    messages,
    selectedMessage,
    stats,
    health,
    loading,
    error,
    filters,
    pagination,
    wsStatus,

    // Actions
    loadMessages,
    loadStats,
    loadHealth,
    markAsProcessed,
    deleteMessage,
    searchMessages,
    cleanupOldMessages,
    updateFilters,
    updatePagination,
    setSelectedMessage,
  };
};
