import { sign, verify, SignOptions, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import bcrypt from 'bcryptjs';
import { prisma } from '../database/client';
import {
  AdminUser,
  JWTPayload,
  LoginRequest,
  LoginResponse,
  TokenValidationResponse,
  CreateAdminRequest,
  ChangePasswordRequest,
  AuthError,
  AuthErrorType,
} from '../types/auth';

export class AuthService {
  private static instance: AuthService;
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly SALT_ROUNDS = 12;

  private constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
    
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️  JWT_SECRET not set in environment variables. Using default (not secure for production)');
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * 初始化认证服务，创建默认管理员账户
   */
  public async initialize(): Promise<void> {
    try {
      // 检查是否已有管理员账户
      const adminCount = await prisma.admin.count();
      
      if (adminCount === 0) {
        // 创建默认管理员账户
        const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
        
        await this.createAdmin({
          username: defaultUsername,
          password: defaultPassword,
        });
        
        console.log(`✅ Default admin created: ${defaultUsername}`);
        console.log(`⚠️  Please change the default password after first login!`);
      }
    } catch (error) {
      console.error('❌ Failed to initialize auth service:', error);
      throw error;
    }
  }

  /**
   * 管理员登录
   */
  public async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      const { username, password } = request;

      // 查找用户
      const admin = await prisma.admin.findUnique({
        where: { username },
      });

      if (!admin) {
        throw this.createAuthError('Invalid username or password', AuthErrorType.INVALID_CREDENTIALS, 401);
      }

      if (!admin.isActive) {
        throw this.createAuthError('Account is inactive', AuthErrorType.USER_INACTIVE, 403);
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
      if (!isPasswordValid) {
        throw this.createAuthError('Invalid username or password', AuthErrorType.INVALID_CREDENTIALS, 401);
      }

      // 更新最后登录时间
      await prisma.admin.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      });

      // 生成JWT token
      const token = this.generateToken({
        userId: admin.id,
        username: admin.username,
        type: 'admin',
      });

      return {
        success: true,
        token,
        user: {
          id: admin.id,
          username: admin.username,
          lastLoginAt: admin.lastLoginAt || undefined,
        },
        expiresIn: this.getTokenExpirationTime(),
      };
    } catch (error) {
      if (error instanceof AuthError) {
        return {
          success: false,
          error: error.message,
        };
      }
      
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Internal server error',
      };
    }
  }

  /**
   * 验证JWT token
   */
  public async validateToken(token: string): Promise<TokenValidationResponse> {
    try {
      const decoded = verify(token, this.JWT_SECRET) as JWTPayload;
      
      // 检查token类型
      if (decoded.type !== 'admin') {
        throw this.createAuthError('Invalid token type', AuthErrorType.TOKEN_INVALID, 401);
      }

      // 查找用户
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.userId },
      });

      if (!admin || !admin.isActive) {
        throw this.createAuthError('User not found or inactive', AuthErrorType.USER_NOT_FOUND, 401);
      }

      return {
        valid: true,
        user: {
          id: admin.id,
          username: admin.username,
        },
      };
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        return {
          valid: false,
          error: 'Token expired',
        };
      }
      
      if (error instanceof JsonWebTokenError) {
        return {
          valid: false,
          error: 'Invalid token',
        };
      }

      if (error instanceof AuthError) {
        return {
          valid: false,
          error: error.message,
        };
      }

      console.error('Token validation error:', error);
      return {
        valid: false,
        error: 'Token validation failed',
      };
    }
  }

  /**
   * 创建管理员账户
   */
  public async createAdmin(request: CreateAdminRequest): Promise<AdminUser> {
    try {
      const { username, password } = request;

      // 验证密码强度
      this.validatePassword(password);

      // 检查用户名是否已存在
      const existingAdmin = await prisma.admin.findUnique({
        where: { username },
      });

      if (existingAdmin) {
        throw this.createAuthError('Username already exists', AuthErrorType.USERNAME_EXISTS, 409);
      }

      // 哈希密码
      const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

      // 创建管理员
      const admin = await prisma.admin.create({
        data: {
          username,
          passwordHash,
          isActive: true,
        },
      });

      return admin;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      console.error('Create admin error:', error);
      throw this.createAuthError('Failed to create admin', AuthErrorType.USER_NOT_FOUND, 500);
    }
  }

  /**
   * 修改密码
   */
  public async changePassword(userId: string, request: ChangePasswordRequest): Promise<boolean> {
    try {
      const { currentPassword, newPassword } = request;

      // 验证新密码强度
      this.validatePassword(newPassword);

      // 查找用户
      const admin = await prisma.admin.findUnique({
        where: { id: userId },
      });

      if (!admin) {
        throw this.createAuthError('User not found', AuthErrorType.USER_NOT_FOUND, 404);
      }

      // 验证当前密码
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isCurrentPasswordValid) {
        throw this.createAuthError('Current password is incorrect', AuthErrorType.INVALID_CREDENTIALS, 401);
      }

      // 哈希新密码
      const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // 更新密码
      await prisma.admin.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      return true;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      console.error('Change password error:', error);
      throw this.createAuthError('Failed to change password', AuthErrorType.USER_NOT_FOUND, 500);
    }
  }

  /**
   * 生成JWT token
   */
  private generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const tokenPayload = {
      userId: payload.userId,
      username: payload.username,
      type: payload.type,
    };

    const options: SignOptions = {
      expiresIn: this.JWT_EXPIRES_IN as StringValue,
    };

    return sign(tokenPayload, this.JWT_SECRET, options);
  }

  /**
   * 获取token过期时间（秒）
   */
  private getTokenExpirationTime(): number {
    // 简单解析过期时间字符串
    const expiresIn = this.JWT_EXPIRES_IN;
    if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 3600;
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 86400;
    } else if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60;
    }
    return parseInt(expiresIn);
  }

  /**
   * 验证密码强度
   */
  private validatePassword(password: string): void {
    if (password.length < 6) {
      throw this.createAuthError('Password must be at least 6 characters long', AuthErrorType.WEAK_PASSWORD, 400);
    }
    
    // 可以添加更多密码强度验证规则
    // if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    //   throw this.createAuthError('Password must contain at least one lowercase letter, one uppercase letter, and one number', AuthErrorType.WEAK_PASSWORD, 400);
    // }
  }

  /**
   * 创建认证错误
   */
  private createAuthError(message: string, type: AuthErrorType, statusCode: number): AuthError {
    return new AuthError(message, type, statusCode);
  }
}
