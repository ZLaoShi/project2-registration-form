import prisma from '../prisma'; // 导入 Prisma ORM 实例
import bcrypt from 'bcrypt'; // 导入 bcrypt 用于加密密码
import jwt from 'jsonwebtoken'; // 导入 jsonwebtoken 用于生成 JWT
import redisClient from '../lib/redis'; // 导入 Redis 客户端
import snowflake from '../utils/snowflake'; // 导入雪花 ID 工具类
import { HTTP_STATUS } from '../utils/httpStatus'; //导入响应码枚举类

const SALT_ROUNDS = 10; // bcrypt 哈希密码时的盐轮数
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // JWT 密钥，从环境变量中获取，若没有则使用默认密钥

// 用户注册
export async function registerUser(data: { username: string; password: string; email: string; code: string }) {
  const { username, password, email, code } = data;

  // 验证验证码
  const verificationResult = await verifyCode(email, code);
  if (!verificationResult.success) {
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      error: verificationResult.message,
    };
  }

  // 检查数据库中是否已经存在该邮箱的用户
  const existingUser = await prisma.users.findUnique({
    where: { email },
  });

  if (existingUser) {
    // 如果是临时用户，只更新信息而不修改 ID
    if (existingUser.role === 'temp') {
      // 更新临时用户的信息
      const updatedUser = await prisma.users.update({
        where: { email },
        data: {
          username,  // 更新用户名
          password: await bcrypt.hash(password, SALT_ROUNDS),  // 更新密码
          role: 'user',  // 更新角色为正式用户
        },
      });

      return {
        type: 'success' as const,
        value: { message: 'User updated successfully', userName: updatedUser.username },
      };
    }

    // 如果是已注册用户，返回用户已存在的错误
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      error: 'User already exists',
    };
  }

  // 如果用户不存在，则是新用户，进行注册
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const newUserId = snowflake.NextId();  // 为正式用户生成新的雪花 ID

  const newUser = await prisma.users.create({
    data: {
      id: newUserId,
      username,
      email,
      password: hashedPassword,
      role: 'user',
    },
  });

  return {
    type: 'success' as const,
    value: { message: 'User registered successfully', userName: newUser.username },
  };
}

// 用户登录
export async function loginUser(data: { email: string; password: string }) {
  const { email, password } = data;

  const user = await prisma.users.findUnique({
    where: { email },
  });

  if (!user) {
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.NOT_FOUND,
      error: 'User not found',
    };
  }

  if (user.role === 'temp') {
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.FORBIDDEN,
      error: 'Temporary users cannot log in',
    };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      error: 'Invalid password',
    };
  }

  const userId = user.id.toString();
  const token = jwt.sign({ userId, role: user.role }, JWT_SECRET);

  await redisClient.setEx(`auth:${userId}`, 604800, token);

  return {
    type: 'success' as const,
    value: { message: 'Login successful', token },
  };
}

// 退出登录
export async function logoutUser(userId: bigint) {
  const token = await redisClient.get(`auth:${userId}`);

  if (!token) {
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.NOT_FOUND,
      error: 'Token not found or already expired',
    };
  }

  await redisClient.del(`auth:${userId}`);

  return {
    type: 'success' as const,
    value: { message: 'Logout successful' },
  };
}

// 验证提交的验证码
export const verifyCode = async (email: string, code: string) => {
  const storedCode = await redisClient.get(`verificationCode:${email}`);

  if (storedCode && storedCode === code) {
    console.log('Verification successful');
    return { success: true, message: 'Verification successful' };
  } else {
    return {
      success: false,
      message: 'Invalid or expired verification code',
    };
  }
};

