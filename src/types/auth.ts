// 管理员用户接口
export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  lastLoginAt?: Date | null;
  isActive: boolean;
}

// JWT Payload 接口
export interface JWTPayload {
  userId: string;
  username: string;
  type: 'admin'; // 区分不同类型的token
  iat: number;
  exp: number;
}

// 登录请求接口
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应接口
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

// 认证状态接口
export interface AuthState {
  isAuthenticated: boolean;
  user?: {
    id: string;
    username: string;
  };
  token?: string;
  loading: boolean;
  error?: string;
}

// Token验证响应接口
export interface TokenValidationResponse {
  valid: boolean;
  user?: {
    id: string;
    username: string;
  };
  error?: string;
}

// 创建管理员请求接口
export interface CreateAdminRequest {
  username: string;
  password: string;
}

// 修改密码请求接口
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// 认证错误类型
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  USERNAME_EXISTS = 'USERNAME_EXISTS',
}

// 认证错误接口
export class AuthError extends Error {
  public type: AuthErrorType;
  public statusCode: number;

  constructor(message: string, type: AuthErrorType, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.type = type;
    this.statusCode = statusCode;
  }
}
