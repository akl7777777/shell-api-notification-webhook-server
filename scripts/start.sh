#!/bin/bash

# Webhook Server 启动脚本

set -e

echo "🚀 启动 Webhook Server..."

# 检查 Node.js 版本
NODE_VERSION=$(node --version)
echo "📦 Node.js 版本: $NODE_VERSION"

# 检查是否存在 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，复制默认配置..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改配置"
fi

# 安装依赖
if [ ! -d node_modules ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 生成 Prisma 客户端
echo "🔧 生成数据库客户端..."
npm run generate

# 运行数据库迁移
echo "🗄️  运行数据库迁移..."
npm run migrate

# 构建项目
echo "🔨 构建项目..."
npm run build

# 启动服务器
echo "🌟 启动服务器..."
npm start
