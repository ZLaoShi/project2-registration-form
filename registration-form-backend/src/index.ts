import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { AddressInfo } from 'node:net';
import authRouter from './auth/router';
import projectRouter from './projects/router';
import registrationRouter from './registrations/router';

const app = new Hono();

// 挂载认证路由
app.route('/auth', authRouter);

app.route('/projects', projectRouter);

app.route('/registrations', registrationRouter);

app.get('/', (c) => {
  return c.text('Hello, Honorld!');
});

app.get('/api', (c) => {
  return c.json({ message: 'Welcome to the API!' });
});

// 使用 @hono/node-server 启动服务
serve({ 
    fetch: app.fetch,
    port: 3000, // 显式指定端口
    hostname: '0.0.0.0' // 指定监听地地址
  }, (info: AddressInfo) => {
    console.log(`Server is listening on http://${info.address}:${info.port}`);
  });
  