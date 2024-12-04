import { Hono } from 'hono';
import ResponseWrapper from '../lib/httpResponse';
import { createProject, deleteProject, updateProject, getProject, getProjects } from './service';
import { authMiddleware } from '../middleware/authMiddleware';

const projectRouter = new Hono();

//管理员创建项目
projectRouter.post(
  '/create', 
  authMiddleware(['admin']), 
  async (c) => {
    const body = await c.req.json();
    const result = await createProject(body);

    return ResponseWrapper.handleResult(c, result);
});

//管理员删除项目
projectRouter.delete(
  '/delete/:id',
  authMiddleware(['admin']), 
  async (c) => {
    const projectId = c.req.param('id');
    const result = await deleteProject(projectId);
    return ResponseWrapper.handleResult(c, result);
  }
);

//管理员更新项目
projectRouter.put(
  '/update/:id',
  authMiddleware(['admin']), 
  async (c) => {
    const projectId = c.req.param('id');
    const body = await c.req.json();
    const result = await updateProject(projectId, body);

    return ResponseWrapper.handleResult(c, result);
  }
);

// 获取单个项目
projectRouter.get(
  '/query/:id',
  async (c) => {
    const projectId = c.req.param('id');
    const result = await getProject(projectId);
    return ResponseWrapper.handleResult(c, result);
  }
);

// 获取项目列表
projectRouter.get(
  '/query-list',
  async (c) => {
    const page = parseInt(c.req.query('page') || '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') || '10', 10);
    const result = await getProjects(page, pageSize);

    return ResponseWrapper.handleResult(c, result);
  }
);


export default projectRouter;
