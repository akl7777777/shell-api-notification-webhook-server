import {
  LoginRequest,
  LoginResponse,
  TokenValidationResponse,
  ChangePasswordRequest,
  ApiResponse,
} from '../types/auth';

class AuthService {
  private baseUrl = '/auth';

  /**
   * 管理员登录
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  /**
   * 验证token
   */
  async verifyToken(token: string): Promise<TokenValidationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  /**
   * 登出
   */
  async logout(token: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(token: string): Promise<TokenValidationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get current user error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  /**
   * 修改密码
   */
  async changePassword(token: string, request: ChangePasswordRequest): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  /**
   * 存储token到localStorage
   */
  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  /**
   * 从localStorage获取token
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * 从localStorage移除token
   */
  removeToken(): void {
    localStorage.removeItem('auth_token');
  }

  /**
   * 检查token是否存在
   */
  hasToken(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
