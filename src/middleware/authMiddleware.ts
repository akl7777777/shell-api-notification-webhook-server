import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { JWTPayload } from '../types/auth';

// 扩展Request接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        type: 'admin';
      };
    }
  }
}

export class AuthMiddleware {
  private static authService = AuthService.getInstance();

  /**
   * JWT认证中间件 - 保护需要管理员权限的路由
   */
  public static async requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 从Authorization header获取token
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Access token required',
          code: 'TOKEN_MISSING',
        });
        return;
      }

      const token = authHeader.substring(7); // 移除 "Bearer " 前缀

      // 验证token
      const validation = await AuthMiddleware.authService.validateToken(token);
      
      if (!validation.valid) {
        res.status(401).json({
          success: false,
          error: validation.error || 'Invalid token',
          code: 'TOKEN_INVALID',
        });
        return;
      }

      // 将用户信息添加到request对象
      req.user = {
        id: validation.user!.id,
        username: validation.user!.username,
        type: 'admin',
      };

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR',
      });
    }
  }

  /**
   * 可选认证中间件 - 如果有token则验证，没有则继续
   */
  public static async optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const validation = await AuthMiddleware.authService.validateToken(token);
        
        if (validation.valid) {
          req.user = {
            id: validation.user!.id,
            username: validation.user!.username,
            type: 'admin',
          };
        }
      }

      next();
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      // 可选认证失败时不阻止请求继续
      next();
    }
  }

  /**
   * 检查用户是否为管理员
   */
  public static requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user || req.user.type !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED',
      });
      return;
    }

    next();
  }

  /**
   * 提取token但不验证 - 用于日志记录等
   */
  public static extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * 检查请求是否来自认证用户
   */
  public static isAuthenticated(req: Request): boolean {
    return !!req.user;
  }

  /**
   * 获取当前用户ID
   */
  public static getCurrentUserId(req: Request): string | null {
    return req.user?.id || null;
  }

  /**
   * 获取当前用户名
   */
  public static getCurrentUsername(req: Request): string | null {
    return req.user?.username || null;
  }
}
