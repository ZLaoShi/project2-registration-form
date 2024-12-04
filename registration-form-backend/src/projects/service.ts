import prisma from '../prisma';
import snowflake from '../utils/snowflake';
import { HTTP_STATUS } from '../utils/httpStatus';

//创建项目
export async function createProject(data: {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_enabled: boolean;
}) {
  const { name, description, start_date, end_date, is_enabled } = data;

  // 简单的输入验证
  if (!name || name.length < 1) {
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      error: 'Project name cannot be empty',
    };
  }
  if (isNaN(Date.parse(start_date)) || isNaN(Date.parse(end_date))) {
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      error: 'Invalid date format',
    };
  }
  if (new Date(start_date) >= new Date(end_date)) {
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      error: 'Start date must be earlier than end date',
    };
  }

  // 检查项目名称是否重复
  const existingProject = await prisma.projects.findUnique({
    where: { name },
  });

  if (existingProject) {
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      error: 'Project name already exists',
    };
  }

  try {
    // 使用雪花 ID 生成主键
    const projectId = snowflake.NextId();

    // 插入数据库
    const project = await prisma.projects.create({
      data: {
        id: projectId,
        name,
        description,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        is_enabled,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return { type: 'success' as const, value: project };
  } catch (error) {
    console.error('Error creating project:', error);
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: 'Error occurred while creating the project',
    };
  }
}

//刪除项目
export async function deleteProject(projectId: string) {
  try {
    // 检查项目是否存在
    const existingProject = await prisma.projects.findUnique({
      where: { id: BigInt(projectId) },
    });

    if (!existingProject) {
      return { type: 'error' as const, statusCode: HTTP_STATUS.NOT_FOUND, error: 'Project not found' };
    }

    // 删除项目
    await prisma.projects.delete({
      where: { id: BigInt(projectId) },
    });

    return { type: 'success' as const, value: { message: 'Project deleted successfully' } };
  } catch (error) {
    return { type: 'error' as const,statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, error: 'Error occurred while deleting the project' };
  }
}

//修改项目
export async function updateProject(
  projectId: string,
  data: Partial<{
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    is_enabled: boolean;
  }>
) {
  try {
    // 检查项目是否存在
    const existingProject = await prisma.projects.findUnique({
      where: { id: BigInt(projectId) },
    });

    if (!existingProject) {
      return {
        type: 'error' as const,
        statusCode: HTTP_STATUS.NOT_FOUND,
        error: 'Project not found',
      };
    }

    // 检查日期的有效性
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          type: 'error' as const,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          error: 'Invalid date format',
        };
      }
      if (startDate >= endDate) {
        return {
          type: 'error' as const,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          error: 'Start date must be earlier than end date',
        };
      }
    }

    // 更新项目
    const updatedProject = await prisma.projects.update({
      where: { id: BigInt(projectId) },
      data: {
        name: data.name,
        description: data.description,
        start_date: data.start_date ? new Date(data.start_date) : undefined,
        end_date: data.end_date ? new Date(data.end_date) : undefined,
        is_enabled: data.is_enabled,
        updated_at: new Date(),
      },
    });

    return { type: 'success' as const, value: updatedProject };
  } catch (error) {
    console.error('Error updating project:', error);
    return {
      type: 'error' as const,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: 'Error occurred while updating the project',
    };
  }
}


// 获取单个项目
export async function getProject(projectId: string) {
  try {
    const project = await prisma.projects.findUnique({
      where: { id: BigInt(projectId) },
    });

    if (!project) {
      return { type: 'error' as const, statusCode: HTTP_STATUS.NOT_FOUND, error: 'Project not found' };
    }

    return { type: 'success' as const, value: project };
  } catch (error) {
    return { type: 'error' as const, statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, error: 'Error occurred while fetching the project' };
  }
}

// 获取项目列表（分页）
export async function getProjects(page: number, pageSize: number) {
  try {
    const skip = (page - 1) * pageSize;
    const [projects, total] = await Promise.all([
      prisma.projects.findMany({
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      prisma.projects.count(),
    ]);

    return {
      type: 'success' as const,
      value: {
        items: projects,
        currentPage: page,
        totalPages: Math.ceil(total / pageSize),
        totalItems: total,
      },
    };
  } catch (error) {
    return { type: 'error' as const, statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, error: 'Error occurred while fetching the project list' };
  }
}