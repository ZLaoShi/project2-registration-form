#!/bin/sh

# 加载 .env 文件中的环境变量
echo "Loading environment variables from .env..."
if [ -f .env ]; then
  export $(cat .env | xargs)
  echo ".env file loaded successfully."
else
  echo ".env file not found!"
  exit 1
fi

# 检查 Redis 是否安装正确
echo "Checking if Redis is installed..."
if ! command -v redis-server &> /dev/null
then
  echo "Redis is not installed. Please install Redis first."
  exit 1
else
  echo "Redis is installed."
fi

# 检查 Redis 是否正确绑定端口 6379
echo "Checking if Redis port 6379 is already in use..."
if nc -z -v -w3 127.0.0.1 6379; then
  echo "Port 6379 is already in use. Please ensure Redis is not already running or choose a different port."
  # 如果 Redis 端口已被占用，提示检查是否已启动本地 Redis
  echo "Possible cause: Local Redis instance might not have been properly shut down."
  exit 1
else
  echo "Port 6379 is available."
fi

# 启动 Redis 服务并放到后台
echo "Starting Redis server in background..."
redis-server --daemonize yes

# 等待 Redis 服务完全启动
echo "Waiting for Redis to start..."
until nc -z -v -w30 127.0.0.1 6379; do
  echo "Waiting for Redis to start... (still checking)"
  sleep 1
done

# 检查 Redis 是否启动成功
if nc -z -v -w30 127.0.0.1 6379; then
  echo "Redis started successfully!"
else
  echo "Failed to start Redis. Exiting script."
  exit 1
fi

# Redis 启动后启动 Node.js 服务
echo "Starting Node.js service..."
pnpm start
