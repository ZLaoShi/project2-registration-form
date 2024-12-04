# 使用轻量化 Node.js 镜像
FROM node:20-alpine

# 安装 Redis
RUN apk add --no-cache redis

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装所有依赖（包括开发依赖）
RUN pnpm install

# 复制 Prisma Schema 文件
COPY prisma ./prisma

# 生成 Prisma 客户端
RUN npx prisma generate

# 复制应用代码
COPY . .

# 构建 TypeScript
RUN pnpm run build

# 删除开发依赖
RUN pnpm prune --prod

# 复制启动脚本
COPY start.sh /app/start.sh

# 给启动脚本执行权限
RUN chmod +x /app/start.sh

# 暴露应用端口
EXPOSE 3000

# 设置容器启动时运行的命令
CMD ["/app/start.sh"]
