import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AuthMiddleware } from '../middleware/authMiddleware';
import {
  LoginRequest,
  CreateAdminRequest,
  ChangePasswordRequest,
  AuthError,
} from '../types/auth';

const router = Router();
const authService = AuthService.getInstance();

/**
 * 管理员登录
 * POST /auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const loginRequest: LoginRequest = req.body;

    // 验证请求数据
    if (!loginRequest.username || !loginRequest.password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS',
      });
    }

    const result = await authService.login(loginRequest);

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * 验证token
 * GET /auth/verify
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const token = AuthMiddleware.extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token required',
        code: 'TOKEN_MISSING',
      });
    }

    const validation = await authService.validateToken(token);

    if (validation.valid) {
      res.json({
        success: true,
        user: validation.user,
      });
    } else {
      res.status(401).json({
        success: false,
        error: validation.error,
        code: 'TOKEN_INVALID',
      });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * 登出（客户端处理，服务端只返回成功）
 * POST /auth/logout
 */
router.post('/logout', AuthMiddleware.requireAuth, (req: Request, res: Response) => {
  // JWT是无状态的，实际的登出逻辑在客户端处理（删除token）
  // 这里只是为了保持API的一致性
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * 获取当前用户信息
 * GET /auth/me
 */
router.get('/me', AuthMiddleware.requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    user: {
      id: req.user!.id,
      username: req.user!.username,
      type: req.user!.type,
    },
  });
});

/**
 * 修改密码
 * POST /auth/change-password
 */
router.post('/change-password', AuthMiddleware.requireAuth, async (req: Request, res: Response) => {
  try {
    const changePasswordRequest: ChangePasswordRequest = req.body;

    // 验证请求数据
    if (!changePasswordRequest.currentPassword || !changePasswordRequest.newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS',
      });
    }

    await authService.changePassword(req.user!.id, changePasswordRequest);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error instanceof Error && 'type' in error) {
      const authError = error as AuthError;
      res.status(authError.statusCode || 500).json({
        success: false,
        error: authError.message,
        code: authError.type,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
});

/**
 * 创建管理员账户（仅限超级管理员，暂时开放用于初始化）
 * POST /auth/create-admin
 */
router.post('/create-admin', async (req: Request, res: Response) => {
  try {
    const createAdminRequest: CreateAdminRequest = req.body;

    // 验证请求数据
    if (!createAdminRequest.username || !createAdminRequest.password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS',
      });
    }

    const admin = await authService.createAdmin(createAdminRequest);

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: admin.id,
        username: admin.username,
        createdAt: admin.createdAt,
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    
    if (error instanceof Error && 'type' in error) {
      const authError = error as AuthError;
      res.status(authError.statusCode || 500).json({
        success: false,
        error: authError.message,
        code: authError.type,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
});

/**
 * 健康检查
 * GET /auth/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'auth',
    timestamp: new Date().toISOString(),
  });
});

export { router as authRouter };
