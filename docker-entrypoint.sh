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
if npx prisma migrate deploy 2>/dev/null; then
    echo "✅ Database migrations completed successfully"
else
    echo "⚠️  Migration failed or no migrations needed, trying to push schema..."
    if npx prisma db push --accept-data-loss 2>/dev/null; then
        echo "✅ Database schema pushed successfully"
    else
        echo "❌ Failed to update database schema"
        echo "🔧 Attempting to create database and retry..."
        
        # 尝试创建数据库文件（对于SQLite）
        mkdir -p /app/data
        touch /app/data/dev.db
        chmod 666 /app/data/dev.db
        
        # 再次尝试推送schema
        if npx prisma db push --accept-data-loss; then
            echo "✅ Database schema created successfully"
        else
            echo "❌ Failed to create database schema"
            exit 1
        fi
    fi
fi

# 生成Prisma客户端（确保最新）
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🎯 Starting application..."

# 启动应用
exec "$@"
