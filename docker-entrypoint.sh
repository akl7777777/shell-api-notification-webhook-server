#!/bin/sh
set -e

echo "🚀 Starting webhook server..."

# 等待数据库连接（如果使用外部数据库）
if [ -n "$DATABASE_URL" ] || [ -n "$PRIMARY_STORAGE_URL" ]; then
    echo "⏳ Waiting for database connection..."
    sleep 5
fi

# 运行数据库迁移
echo "🔄 Running database migrations..."

# 确保数据目录存在
mkdir -p /app/data
chmod 755 /app/data

# 首先尝试migrate deploy
if npx prisma migrate deploy 2>/dev/null; then
    echo "✅ Database migrations completed successfully"
else
    echo "⚠️  No migrations found, pushing schema directly..."

    # 强制推送schema来创建所有表
    if npx prisma db push --accept-data-loss --force-reset; then
        echo "✅ Database schema pushed successfully"
    else
        echo "❌ Failed to push schema, trying alternative approach..."

        # 删除现有数据库并重新创建
        rm -f /app/data/webhook.db /app/data/dev.db

        # 再次尝试推送schema
        if npx prisma db push --accept-data-loss; then
            echo "✅ Database schema created successfully"
        else
            echo "❌ Failed to create database schema"
            exit 1
        fi
    fi
fi

# Prisma客户端已在构建时生成，跳过重新生成以避免权限问题
echo "✅ Using pre-generated Prisma client from build stage"

echo "🎯 Starting application..."

# 启动应用
exec "$@"
