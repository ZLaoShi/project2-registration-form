import { Hono } from 'hono';
import ResponseWrapper from '../lib/httpResponse';
import { registerForProject, queryByContactInfo, queryByQueryKey, queryUserRegistrations, queryAdminRegistrations, updateRegistrationStatus, cancelRegistration, verifyTemporaryRegistration, exportRegistrations } from './service';
import { extractUserIdFromToken } from '../lib/jwt'; // Token 解码工具
import { authMiddleware } from '../middleware/authMiddleware';
import { RegistrationStatus } from '../types/RegistrationStatus';
import { sendTemporaryUserRegistrationVerificationCode } from '../mail/service';

const registrationRouter = new Hono();

//报名路由
registrationRouter.post('/register', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  let userId: bigint | null = null;

  if (token) {
    try {
      userId = extractUserIdFromToken(token); // 从 Token 提取 userId
    } catch (error) {
      return ResponseWrapper.error(c, 401, 'Token 无效或已过期');
    }
  }

  const body = await c.req.json(); //这里信任输入留出让已注册用户选择更换联系方式的自由
  const { projectId, name, contactInfo, isContactQueryAllowed } = body;

  if (!projectId || !name || !contactInfo) { 
    return ResponseWrapper.error(c, 400, '缺少必要的报名信息');
  }

  const result = await registerForProject({
    userId, // 传递解码后的 userId 或 null
    projectId,
    name,
    contactInfo,
    isContactQueryAllowed: !!isContactQueryAllowed,
  });

  return ResponseWrapper.handleResult(c, result);
});

//使用查询key或者联系方式查询路由
registrationRouter.get('/query', async (c) => {
  const queryKey = c.req.query('query_key');
  const contactInfo = c.req.query('contact_info');

  if (!queryKey && !contactInfo) {
    return ResponseWrapper.error(c, 400, '缺少查询条件（query_key 或 contact_info）');
  }

  if (queryKey) {
    // 通过 query_key 查询单条记录
    const result = await queryByQueryKey(queryKey);
    return ResponseWrapper.handleResult(c, result);
  } else if (contactInfo) {
    // 通过 contact_info 查询多条记录
    const result = await queryByContactInfo(contactInfo);
    return ResponseWrapper.handleResult(c, result);
  }
});

//用户查询已报名路由
registrationRouter.get(
  '/user-registrations',
  authMiddleware(['user']), 
  async (c) => {
  const userId = c.get('userId');
  console.log(userId); 
  const projectId = c.req.query('project_id');
  console.log("this p_id " + projectId);
  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('page_size') || '10', 10);

  const result = await queryUserRegistrations(userId, projectId, page, pageSize);

  return ResponseWrapper.handleResult(c, result);
});

//管理员查询所有已报名路由
registrationRouter.get(
  '/admin-registrations', 
  authMiddleware(['admin']), 
  async (c) => {
  const projectId = c.req.query('project_id');
  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('page_size') || '10', 10);

  const result = await queryAdminRegistrations(projectId, page, pageSize);

  return ResponseWrapper.handleResult(c, result);
});

// 管理员更新报名状态
registrationRouter.put(
  '/update-status',
  authMiddleware(['admin']),
  async (c) => {
    const { queryKey, newStatus } = await c.req.json();

    // 枚举类型检查
    if (!Object.values(RegistrationStatus).includes(newStatus)) {
      return ResponseWrapper.error(c, 400, '无效的报名状态');
    }

    const result = await updateRegistrationStatus(queryKey, newStatus);

    return ResponseWrapper.handleResult(c, result);
  }
);

// 用户或临时用户取消报名
registrationRouter.put('/cancel-registration', async (c) => {
  // 获取 Authorization Header 的 Token
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  let userId: bigint;

  if (token) {
    try {
      // 如果存在 Token，解析 userId
      userId = extractUserIdFromToken(token); // 使用抽取函数解析 Token 并提取 userId
    } catch (error) {
      return ResponseWrapper.error(c, 401, 'Token 无效或过期');
    }
  } else {
    // 无 Token，从请求中获取 userId
    const { userId: tempUserId } = await c.req.json();
    if (typeof tempUserId !== 'number' || tempUserId >= 0) {
      return ResponseWrapper.error(c, 400, '非法的用户标识');
    }
    userId = BigInt(tempUserId); 
  }

  // 获取查询键（queryKey）
  const { queryKey } = await c.req.json();
  if (!queryKey) {
    return ResponseWrapper.error(c, 400, '报名记录的查询键不能为空');
  }

  // 调用服务层取消报名逻辑
  const result = await cancelRegistration(userId, queryKey);
  return ResponseWrapper.handleResult(c, result);
});

//临时用户发送修改报名状态验证码
registrationRouter.post('/send-verification-code', async (c) => {
  const { email, queryKey } = await c.req.json();

  if (!email || !queryKey) {
    return ResponseWrapper.error(c, 400, 'Email and Query Key are required');
  }

  const result = await sendTemporaryUserRegistrationVerificationCode(email, queryKey);
  return ResponseWrapper.handleResult(c, result);
});

//临时用户修改报名状态路由
registrationRouter.put('/verify-temporary-registration', async (c) => {
  try {
    const { email, queryKey, verificationCode } = await c.req.json();

    if (!email || !queryKey || !verificationCode) {
      return ResponseWrapper.error(c, 400, '缺少必要的验证信息');
    }

    const result = await verifyTemporaryRegistration(email, queryKey, verificationCode);

    return ResponseWrapper.handleResult(c, result);
  } catch (error) {
    console.error('Error in /verify-temporary-registration router:', error);
    return ResponseWrapper.error(c, 500, '验证临时报名状态时发生错误');
  }
});

// 导出报名数据，管理员专用
registrationRouter.get(
  '/export',
  authMiddleware(['admin']), // 限制为管理员角色
  async (c) => {
    try {
      // 调用导出服务（无需在路由层处理 projectId）
      const buffer = await exportRegistrations(c);

      // 设置响应头并返回文件
      c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      c.header('Content-Disposition', `attachment; filename="registrations.xlsx"`);
      return c.body(buffer);
    } catch (error) {
      console.error('Error exporting registrations:', error);
      return ResponseWrapper.error(c, 500, 'Failed to export registrations');
    }
  }
);

export default registrationRouter;
