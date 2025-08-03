# 多阶段构建 - 构建阶段
FROM node:20-alpine AS builder

# 设置 Prisma 二进制目标为 linux-musl
ENV PRISMA_QUERY_ENGINE_BINARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl.so.node
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl.so.node

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖（包括开发依赖）
# 使用 npm install 自动生成 package-lock.json
RUN npm install

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建 TypeScript
RUN npm run build

# 生产阶段
FROM node:20-alpine AS production

# 设置 Prisma 二进制目标为 linux-musl
ENV PRISMA_QUERY_ENGINE_BINARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl.so.node
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl.so.node

# 安装必要的系统依赖，包括 Prisma 需要的 OpenSSL
RUN apk add --no-cache \
    curl \
    dumb-init \
    openssl \
    libc6-compat \
    && rm -rf /var/cache/apk/*

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S webhook -u 1001

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/

# 只安装生产依赖
# 使用 npm install 自动生成 package-lock.json
RUN npm install --only=production && npm cache clean --force

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 复制其他必要文件
COPY --chown=webhook:nodejs .env.example .env

# 创建日志目录
RUN mkdir -p /app/logs && chown -R webhook:nodejs /app/logs

# 切换到非 root 用户
USER webhook

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 使用 dumb-init 作为 PID 1
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "dist/index.js"]
