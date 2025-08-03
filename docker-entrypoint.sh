#!/bin/sh
set -e

echo "🚀 Starting webhook server..."

# 等待数据库连接（如果使用外部数据库）
if [ -n "$DATABASE_URL" ] || [ -n "$PRIMARY_STORAGE_URL" ]; then
    echo "⏳ Waiting for database connection..."
    sleep 5
fi

# 确保数据目录存在
echo "📁 Ensuring data directory exists..."
mkdir -p /app/data
chmod 755 /app/data

echo "🎯 Starting application with database auto-initialization..."

# 启动应用（数据库初始化将在Node.js代码中处理）
exec "$@"
