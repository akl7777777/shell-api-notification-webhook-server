import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, LoginRequest, ChangePasswordRequest, User } from '../types/auth';
import { authService } from '../services/authService';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  verifyToken: () => Promise<boolean>;
  changePassword: (request: ChangePasswordRequest) => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null,

      // Actions
      login: async (credentials: LoginRequest): Promise<boolean> => {
        set({ loading: true, error: null });

        try {
          const response = await authService.login(credentials);

          if (response.success && response.token && response.user) {
            const user: User = {
              id: response.user.id,
              username: response.user.username,
              type: 'admin',
            };

            // 存储token
            authService.setToken(response.token);

            set({
              isAuthenticated: true,
              user,
              token: response.token,
              loading: false,
              error: null,
            });

            return true;
          } else {
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              loading: false,
              error: response.error || 'Login failed',
            });

            return false;
          }
        } catch (error) {
          console.error('Login error:', error);
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false,
            error: 'Network error occurred',
          });

          return false;
        }
      },

      logout: async (): Promise<void> => {
        const { token } = get();

        set({ loading: true });

        try {
          if (token) {
            await authService.logout(token);
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // 无论API调用是否成功，都清除本地状态
          authService.removeToken();
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false,
            error: null,
          });
        }
      },

      verifyToken: async (): Promise<boolean> => {
        const token = authService.getToken();

        if (!token) {
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false,
            error: null,
          });
          return false;
        }

        set({ loading: true, error: null });

        try {
          const response = await authService.verifyToken(token);

          if (response.success && response.user) {
            const user: User = {
              id: response.user.id,
              username: response.user.username,
              type: 'admin',
            };

            set({
              isAuthenticated: true,
              user,
              token,
              loading: false,
              error: null,
            });

            return true;
          } else {
            // Token无效，清除本地存储
            authService.removeToken();
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              loading: false,
              error: response.error || 'Token verification failed',
            });

            return false;
          }
        } catch (error) {
          console.error('Token verification error:', error);
          authService.removeToken();
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false,
            error: 'Network error occurred',
          });

          return false;
        }
      },

      changePassword: async (request: ChangePasswordRequest): Promise<boolean> => {
        const { token } = get();

        if (!token) {
          set({ error: 'Not authenticated' });
          return false;
        }

        set({ loading: true, error: null });

        try {
          const response = await authService.changePassword(token, request);

          if (response.success) {
            set({ loading: false, error: null });
            return true;
          } else {
            set({
              loading: false,
              error: response.error || 'Password change failed',
            });
            return false;
          }
        } catch (error) {
          console.error('Change password error:', error);
          set({
            loading: false,
            error: 'Network error occurred',
          });
          return false;
        }
      },

      clearError: (): void => {
        set({ error: null });
      },

      setLoading: (loading: boolean): void => {
        set({ loading });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // 只持久化必要的状态，不包括loading和error
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
    }
  )
);
