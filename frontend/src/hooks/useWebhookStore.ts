import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  WebhookMessage,
  WebhookStats,
  HealthStatus,
  FilterState,
  PaginationState,
} from '@/types/webhook';

interface WebhookStore {
  // State
  messages: WebhookMessage[];
  selectedMessage: WebhookMessage | null;
  stats: WebhookStats | null;
  health: HealthStatus | null;
  loading: boolean;
  error: string | null;
  filters: FilterState;
  pagination: PaginationState;
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'error';

  // Actions
  setMessages: (messages: WebhookMessage[]) => void;
  addMessage: (message: WebhookMessage) => void;
  updateMessage: (id: string, updates: Partial<WebhookMessage>) => void;
  removeMessage: (id: string) => void;
  setSelectedMessage: (message: WebhookMessage | null) => void;
  setStats: (stats: WebhookStats) => void;
  setHealth: (health: HealthStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setPagination: (pagination: Partial<PaginationState>) => void;
  setWsStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  reset: () => void;
}

const initialState = {
  messages: [],
  selectedMessage: null,
  stats: null,
  health: null,
  loading: false,
  error: null,
  filters: {},
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
  },
  wsStatus: 'disconnected' as const,
};

export const useWebhookStore = create<WebhookStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setMessages: (messages) =>
        set({ messages }, false, 'setMessages'),

      addMessage: (message) =>
        set(
          (state) => ({
            messages: [message, ...state.messages],
            stats: state.stats
              ? {
                  ...state.stats,
                  total: state.stats.total + 1,
                  last24Hours: state.stats.last24Hours + 1,
                }
              : null,
          }),
          false,
          'addMessage'
        ),

      updateMessage: (id, updates) =>
        set(
          (state) => ({
            messages: state.messages.map((msg) =>
              msg.id === id ? { ...msg, ...updates } : msg
            ),
            selectedMessage:
              state.selectedMessage?.id === id
                ? { ...state.selectedMessage, ...updates }
                : state.selectedMessage,
          }),
          false,
          'updateMessage'
        ),

      removeMessage: (id) =>
        set(
          (state) => ({
            messages: state.messages.filter((msg) => msg.id !== id),
            selectedMessage:
              state.selectedMessage?.id === id ? null : state.selectedMessage,
            stats: state.stats
              ? {
                  ...state.stats,
                  total: Math.max(0, state.stats.total - 1),
                }
              : null,
          }),
          false,
          'removeMessage'
        ),

      setSelectedMessage: (message) =>
        set({ selectedMessage: message }, false, 'setSelectedMessage'),

      setStats: (stats) =>
        set({ stats }, false, 'setStats'),

      setHealth: (health) =>
        set({ health }, false, 'setHealth'),

      setLoading: (loading) =>
        set({ loading }, false, 'setLoading'),

      setError: (error) =>
        set({ error }, false, 'setError'),

      setFilters: (filters) =>
        set(
          (state) => ({ filters: { ...state.filters, ...filters } }),
          false,
          'setFilters'
        ),

      setPagination: (pagination) =>
        set(
          (state) => ({ pagination: { ...state.pagination, ...pagination } }),
          false,
          'setPagination'
        ),

      setWsStatus: (wsStatus) =>
        set({ wsStatus }, false, 'setWsStatus'),

      reset: () =>
        set(initialState, false, 'reset'),
    }),
    {
      name: 'webhook-store',
    }
  )
);
