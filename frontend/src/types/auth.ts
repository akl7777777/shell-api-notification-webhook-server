// 前端认证相关类型定义

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    username: string;
    lastLoginAt?: Date;
  };
  expiresIn?: number;
  error?: string;
}

export interface User {
  id: string;
  username: string;
  type: 'admin';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface TokenValidationResponse {
  success: boolean;
  user?: User;
  error?: string;
  code?: string;
}
