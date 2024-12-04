// src/auth/router.ts
import { Hono, Context } from 'hono';
import ResponseWrapper from '../lib/httpResponse';  
import { registerUser, loginUser, logoutUser, verifyCode } from './service';
import { authMiddleware } from '../middleware/authMiddleware';
import { AuthEnv } from '../types/authContext'; 
import  { sendVerificationCode } from '../mail/service';

const authRouter = new Hono();

// 用户注册路由
authRouter.post('/register', async (c) => {
  const body = await c.req.json();
  const result = await registerUser(body);
  
  return ResponseWrapper.handleResult(c, result);
});

// 用户登录路由
authRouter.post('/login', async (c) => {
  const body = await c.req.json();
  const result = await loginUser(body);

  return ResponseWrapper.handleResult(c, result);
});

// 用户退出登录路由
authRouter.post(
  '/logout', 
  authMiddleware([]), 
  async (c: Context<AuthEnv>) => { 
  const userId = c.get('userId');
  const result = await logoutUser(userId);

  return ResponseWrapper.handleResult(c, result);
});

// 请求发送验证码
authRouter.post('/send-code', async (c) => {
  const { email } = await c.req.json();
  const result = await sendVerificationCode(email);
  
  return ResponseWrapper.handleResult(c, result);
});



export default authRouter;
