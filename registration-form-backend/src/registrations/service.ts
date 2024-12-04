import prisma from "../prisma";
import { generateQueryKey } from "../utils/generateCode";
import { HTTP_STATUS } from "../utils/httpStatus";
import snowflake, { generateTempUserId } from "../utils/snowflake";
import { RegistrationStatus } from '../types/RegistrationStatus'
import redisClient from "../lib/redis";
import { Workbook } from 'exceljs';
import { Context } from "hono";

interface RegistrationData {
  userId: bigint | null;
  projectId: string;
  name: string;
  contactInfo: string;
  isContactQueryAllowed: boolean;
}

//报名
export async function registerForProject(data: RegistrationData) {
  const { userId, projectId, name, contactInfo, isContactQueryAllowed } = data;
  let isUser = true;

  try {
    // 如果 userId 为 null，生成临时用户 ID
    var finalUserId = userId || generateTempUserId();

    // 为临时用户插入伪用户记录
    if (!userId) {
      const existingUserId = await ensureTempUser(finalUserId, contactInfo);
      finalUserId = existingUserId; // 如果已有用户，使用其 ID
      isUser = false;
    }

    // 检查项目是否存在
    const project = await prisma.projects.findUnique({
      where: { id: BigInt(projectId) },
    });
    if (!project) {
      return {
        type: 'error' as const,
        statusCode: HTTP_STATUS.NOT_FOUND,
        error: 'Project not found',
      };
    }

    // 检查项目是否开放报名
    if (!project.is_enabled) {
      return {
        type: 'error' as const,
        statusCode: HTTP_STATUS.FORBIDDEN,
        error: 'Project registration is not enabled',
      };
    }

    // 检查是否已报名
    const existingRegistration = await prisma.registrations.findFirst({
      where: {
        user_id: finalUserId,
        project_id: BigInt(projectId),
      },
    });

    if (existingRegistration) {
      return {
        type: 'error' as const,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        error: 'You are already registered for this project',
      };
    }

    // 检查是否存在相同的联系方式，且状态为 Pending
    const contactRegistration = await prisma.registrations.findFirst({
      where: {
        contact_info: contactInfo,
        project_id: BigInt(projectId),
        status: RegistrationStatus.Pending, // 状态为 Pending
      },
    });

    if (contactRegistration) {
      return {
        type: 'error' as const,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        error: 'This contact information is already registered for the project and is pending approval',
      };
    }

    // 生成 query_key
    const queryKey = generateQueryKey();

    const status = isUser
      ? RegistrationStatus.Pending // 正式用户默认状态为 Pending
      : RegistrationStatus.VerificationPending; // 临时用户默认状态为 VerificationPending

    // 创建报名记录
    const registration = await prisma.registrations.create({
      data: {
        id: snowflake.NextId(),
        user_id: finalUserId,
        project_id: BigInt(projectId),
        name,
        contact_info: contactInfo,
        query_key: queryKey,
        is_contact_query_allowed: isContactQueryAllowed,
        created_at: new Date(),
        status, // 动态设置状态
      },
    });

    // 返回统一结果，去掉 id
    return {
      type: "success" as const,
      value: {
        query_key: registration.query_key,
        project_id: registration.project_id,
        name: registration.name,
        contact_info: registration.contact_info,
        is_contact_query_allowed: registration.is_contact_query_allowed,
        created_at: registration.created_at,
        status: registration.status,
      },
    };
  } catch (error) {
    console.error('Error during registration:', error);
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: 'An error occurred during registration',
    };
  }
}

// 为临时用户插入记录以满足报名表的外键设置
async function ensureTempUser(userId: bigint, email: string) {
  // 首先检查是否有该联系信息的用户记录
  const existingUserByContact = await prisma.users.findUnique({
    where: { email }, // 假设contactInfo对应email字段，若是其他字段可修改
  });

  if (existingUserByContact) {
    // 如果找到了已有的用户，使用现有的用户 ID
    return existingUserByContact.id; // 返回已有用户的 ID，避免重复创建
  }

  // 如果没有找到相同的用户，创建新的临时用户
  const newUser = await prisma.users.create({
    data: {
      id: userId, // 临时用户 ID
      username: `temp_${userId}`, // 临时用户名
      email,
      password: '', // 无密码
      role: 'temp', // 临时用户角色
    },
  });

  return newUser.id; // 返回新创建的用户 ID
}


// 根据联系方式查询
export async function queryByContactInfo(contactInfo: string) {
  try {
    // 根据 contact_info 查询记录
    const registrations = await prisma.registrations.findMany({
      where: {
        contact_info: contactInfo,
        is_contact_query_allowed: true, // 仅查询允许公开的记录
      },
      orderBy: { created_at: 'desc' },
    });

    if (registrations.length === 0) {
      return { type: 'error' as const, statusCode: HTTP_STATUS.NOT_FOUND, error: 'Record not found' };
    }

    return { type: 'success' as const, value: registrations };
  } catch (error) {
    console.error('Error querying by contact info:', error);
    return { type: 'error' as const, statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, error: 'An error occurred during the query' };
  }
}

// 根据查询key查询
export async function queryByQueryKey(queryKey: string) {
  try {
    // 根据 query_key 查询单条记录
    const registration = await prisma.registrations.findUnique({
      where: { query_key: queryKey },
    });

    if (!registration) {
      return { type: 'error' as const, statusCode: HTTP_STATUS.NOT_FOUND, error: 'Registration record not found' };
    }

    return { type: 'success' as const, value: registration };
  } catch (error) {
    console.error('Error querying by query_key:', error);
    return { type: 'error' as const, statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, error: 'An error occurred during the query' };
  }
}

// 用户查询自己所有的已报名
export async function queryUserRegistrations(userId: bigint, projectId?: string, page = 1, pageSize = 10) {
  const skip = (page - 1) * pageSize;

  const where: Record<string, any> = { user_id: userId };
  if (projectId) {
    where.project_id = BigInt(projectId);
  }

  try {
    const [registrations, total] = await Promise.all([
      prisma.registrations.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      prisma.registrations.count({ where }),
    ]);

    return {
      type: 'success' as const,
      value: {
        items: registrations,
        currentPage: page,
        totalPages: Math.ceil(total / pageSize),
        totalItems: total,
      },
    };
  } catch (error) {
    console.error('Error querying user registrations:', error);
    return { type: 'error' as const, statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, error: 'An error occurred while querying user registration records' };
  }
}

// 管理员查询所有报名记录
export async function queryAdminRegistrations(projectId?: string, page = 1, pageSize = 10) {
  const skip = (page - 1) * pageSize;

  const where: Record<string, any> = {};
  if (projectId) {
    where.project_id = BigInt(projectId);
  }

  try {
    const [registrations, total] = await Promise.all([
      prisma.registrations.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      prisma.registrations.count({ where }),
    ]);

    return {
      type: 'success' as const,
      value: {
        items: registrations,
        currentPage: page,
        totalPages: Math.ceil(total / pageSize),
        totalItems: total,
      },
    };
  } catch (error) {
    console.error('Error querying admin registrations:', error);
    return { type: 'error' as const, statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, error: 'An error occurred while querying admin registration records' };
  }
}

// 管理员更新报名状态
export async function updateRegistrationStatus(queryKey: string, newStatus: RegistrationStatus) {
  if (!Object.values(RegistrationStatus).includes(newStatus)) {
    return { type: 'error' as const, statusCode: HTTP_STATUS.BAD_REQUEST, error: 'Invalid registration status' };
  }

  try {
    const existingRegistration = await prisma.registrations.findUnique({
      where: { query_key: queryKey },
    });

    if (!existingRegistration) {
      return { type: 'error' as const, statusCode: HTTP_STATUS.NOT_FOUND, error: 'Corresponding registration record not found' };
    }

    const updatedRegistration = await prisma.registrations.update({
      where: { query_key: queryKey },
      data: { status: newStatus },
    });

    return { type: 'success' as const, value: updatedRegistration };
  } catch (error) {
    console.error('Error updating registration status:', error);
    return { type: 'error' as const, statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, error: 'An error occurred while updating the registration status' };
  }
}

// 用户取消报名
export async function cancelRegistration(userId: bigint, queryKey: string) {
  try {
    // 查询报名记录
    const registration = await prisma.registrations.findUnique({
      where: { query_key: queryKey },
    });

    // 检查报名记录是否存在
    if (!registration) {
      return {
        type: 'error' as const,
        statusCode: HTTP_STATUS.NOT_FOUND,
        error: 'The corresponding registration record was not found',
      };
    }

    // 检查 userId 是否匹配
    if (registration.user_id !== userId) {
      return {
        type: 'error' as const,
        statusCode: HTTP_STATUS.FORBIDDEN,
        error: 'The user does not have permission to cancel this registration record',
      };
    }

    // 更新报名状态为 Canceled
    const updatedRegistration = await prisma.registrations.update({
      where: { query_key: queryKey },
      data: { status: RegistrationStatus.Canceled },
    });

    return { type: 'success' as const, value: { message: 'The registration status has been successfully updated to canceled' } };
  } catch (error) {
    console.error('Error canceling registration:', error);
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: 'An error occurred while canceling the registration',
    };
  }
}

// 临时用户修改报名状态
export const verifyTemporaryRegistration = async (
  email: string,
  queryKey: string,
  verificationCode: string
) => {
  try {
    const redisKey = `verificationCode:${email}:${queryKey}`;
    const storedCode = await redisClient.get(redisKey);

    if (!storedCode) {
      return { type: 'error' as const, statusCode: HTTP_STATUS.BAD_REQUEST, error: 'The verification code is invalid or has expired' };
    }

    if (storedCode !== verificationCode) {
      return { type: 'error' as const, statusCode: HTTP_STATUS.BAD_REQUEST, error: 'The verification code is incorrect' };
    }

    const registration = await prisma.registrations.findUnique({
      where: { query_key: queryKey },
    });

    if (!registration) {
      return { type: 'error' as const, statusCode: HTTP_STATUS.NOT_FOUND, error: 'The corresponding registration record was not found' };
    }

    // 检查当前报名状态是否为 VerificationPending
    if (registration.status !== RegistrationStatus.VerificationPending) {
      return {
        type: 'error' as const,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        error: 'The current registration status does not allow updating to verified',
      };
    }

    // 更新报名状态为已验证
    const updatedRegistration = await prisma.registrations.update({
      where: { query_key: queryKey },
      data: { status: RegistrationStatus.Approved },
    });

    // 删除 Redis 中的验证码，防止重复使用
    await redisClient.del(redisKey);

    return {
      type: 'success' as const,
      value: {
        message: 'The registration status has been updated to verified',
        registration: updatedRegistration,
      },
    };
  } catch (error) {
    console.error('Error verifying temporary registration in service:', error);
    return { type: 'error' as const, statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, error: 'An error occurred while verifying the temporary registration status' };
  }
};

/**
 * 导出报名记录
 * @param c 请求上下文
 * @returns Buffer 包含 Excel 文件内容
 */
export async function exportRegistrations(c: Context) {
  try {
    const projectId = c.req.query('projectId');

    // 查询 registrations 数据
    const registrations = await prisma.registrations.findMany({
      where: projectId ? { project_id: BigInt(projectId) } : undefined,
    });

    if (registrations.length === 0) {
      throw new Error('No registrations found for the given project.');
    }

    // 分步查询关联的用户和项目数据
    const userIds = registrations.map((reg: any) => reg.user_id).filter(Boolean) as bigint[];
    const projectIds = registrations.map((reg: any) => reg.project_id).filter(Boolean) as bigint[];

    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
    });

    const projects = await prisma.projects.findMany({
      where: { id: { in: projectIds } },
    });

    // 合并数据
    const mergedData = registrations.map((reg: any) => {
      const user = users.find((u) => u.id === reg.user_id);
      const project = projects.find((p) => p.id === reg.project_id);

      return {
        ...reg,
        user_name: user?.username || 'N/A',
        project_name: project?.name || 'N/A',
      };
    });

    // 创建 Excel 表格
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Registrations');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 20 },
      { header: 'User ID', key: 'user_id', width: 20 },
      { header: 'User Name', key: 'user_name', width: 30 },
      { header: 'Project ID', key: 'project_id', width: 20 },
      { header: 'Project Name', key: 'project_name', width: 30 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Contact Info', key: 'contact_info', width: 30 },
      { header: 'Query Key', key: 'query_key', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Created At', key: 'created_at', width: 25 },
    ];

    mergedData.forEach((data: any) => {
      sheet.addRow({
        id: data.id.toString(),
        user_id: data.user_id?.toString() || 'N/A',
        user_name: data.user_name,
        project_id: data.project_id?.toString() || 'N/A',
        project_name: data.project_name,
        name: data.name,
        contact_info: data.contact_info,
        query_key: data.query_key,
        status: data.status,
        created_at: data.created_at ? data.created_at.toISOString() : 'N/A',
      });
    });

    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    console.error('Error exporting registrations:', error);
    throw new Error('Failed to export registrations');
  }
}
