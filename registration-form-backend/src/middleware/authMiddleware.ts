// src/middleware/authMiddleware.ts
import { Context, Next } from 'hono'; // Hono 框架的 Context 和 Next 类型
import { AuthSchema } from '../types/authSchema'; // 定义 JWT payload 的 Zod 验证规则
import { verifyToken } from '../lib/jwt'; // 用于验证和解码 JWT 的函数
import ResponseWrapper from '../lib/httpResponse'; // 统一的 HTTP 响应封装工具
import { AuthEnv } from '../types/authContext'; // 自定义的上下文类型，包含 userId 和 role 等变量

/**
 * 鉴权中间件
 * @param allowedRoles - 允许访问当前路由的角色数组
 * @returns Hono 中间件函数
 */
export const authMiddleware = (allowedRoles: string[]) => {
  return async (c: Context<AuthEnv>, next: Next) => {
    // 从请求头中获取 Authorization 字段并去掉 'Bearer ' 前缀
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    // 如果没有提供 Token，则返回错误响应
    if (!token) {
      return ResponseWrapper.handleResult(c, { type: 'error', error: 'No token provided' });
    }

    // 使用自定义的 verifyToken 函数解码并验证 Token
    const decoded = verifyToken(token);
    
    // 如果 Token 无效或已过期，则返回错误响应
    if (!decoded) {
      return ResponseWrapper.handleResult(c, { type: 'error', error: 'Invalid or expired token' });
    }

    // 打印解码后的 Token 内容（用于调试）
    console.log(decoded);

    // 使用 Zod 验证解码后的 Token 数据结构是否符合预期
    const parsedResult = AuthSchema.safeParse(decoded);

    // 如果验证失败，说明 Token payload 不符合预期结构，返回错误响应
    if (!parsedResult.success) {
      return ResponseWrapper.handleResult(c, { type: 'error', error: 'Invalid token payload' });
    }

    // 从验证通过的结果中解构出 userId 和 role
    const { userId, role } = parsedResult.data;

    // 如果当前路由限制了访问角色，并且用户角色不在允许的角色列表中，则返回权限不足的错误响应
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return ResponseWrapper.handleResult(c, { type: 'error', error: 'Insufficient permissions' });
    }

    // 将 userId 和 role 存入上下文，供后续中间件或路由处理器使用
    c.set('userId', userId);
    c.set('role', role);

    // 继续执行后续中间件或路由处理器
    await next();
  };
};
