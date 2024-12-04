import { PrismaClient } from '@prisma/client';

// 创建 PrismaClient 实例
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'], // 记录日志以帮助调试
});

// 优雅关闭：在 Node.js 应用进程结束时断开数据库连接
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
