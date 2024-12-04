import { createClient } from 'redis'; // 使用新版本的 redis 包

// 创建 Redis 客户端
const redisClient = createClient({
  url: 'redis://localhost:6379',  // 直接指定 Redis 的连接 URL
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
  console.error('Redis error: ', err);
});

redisClient.connect();

// 导出 Redis 客户端实例
export default redisClient;
