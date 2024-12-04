## **安装依赖**

```powershell
pnpm install
```

## **本地调试**

生成Prisma 客户端

```powershell
pnpm prisma generate
```

启动本地调试服务器

```powershell
pnpm run dev
```



## docker 部署

```powershell
docker build -t registration-form-backend .
```

## 运行

```powershell
docker run -d -p 3000:3000 --name registration-form-backend-container `
  -v ${PWD}/.env:/app/.env `
  registration-form-backend
```

注意：以上是win11环境下的powershell指令,不适用于其他操作系统（例如 Linux 或 macOS）。对于其他操作系统，请根据系统要求调整命令



## prisma 基本操作

#### **1. 数据库拉取（Introspection）**

- **命令**：`npx prisma db pull`
- **用途**：将现有数据库的表结构拉取到 Prisma 的数据模型文件 `schema.prisma` 中。
- **场景**：通常用于与已有数据库同步，使 `schema.prisma` 反映出当前数据库的结构，特别是当数据库已有改动时。

#### **2. 生成 Prisma Client**

- **命令**：`npx prisma generate`
- **用途**：生成 Prisma Client，用于在 TypeScript 或 JavaScript 代码中与数据库进行交互。
- **场景**：每当您对 `schema.prisma` 做出更改后，需要重新生成 Prisma Client，以便代码中的数据库操作与最新的模型同步。

#### **3. 数据库迁移**

- **命令**：`npx prisma migrate dev --name migration_name`
- **用途**：对数据库进行迁移，基于数据模型的更改更新数据库结构。例如，添加表、修改列等。
- **场景**：当您对 `schema.prisma` 做出更改，且需要将这些更改应用到实际数据库时，使用该命令会自动创建迁移文件并同步数据库。
- **注意**：`migration_name` 是一个描述性名称，帮助标识这次迁移的目的。

#### **4. 使用 Prisma Studio 查看数据库**

- **命令**：`npx prisma studio`

- **用途**：启动 Prisma Studio，一个直观的数据库管理界面，便于查看和管理数据库中的数据。

- **场景**：用于查看当前数据库内容，手动添加、更新或删除数据，调试数据问题等。

  

## 作者

此项目由 暝涬无疆 创建。

如果你对项目有任何疑问，欢迎通过 3280108463@qq.com 联系我。
