#!/bin/sh
set -e

echo "🚀 Starting webhook server..."

# 等待数据库连接（如果使用外部数据库）
if [ -n "$DATABASE_URL" ] || [ -n "$PRIMARY_STORAGE_URL" ]; then
    echo "⏳ Waiting for database connection..."
    sleep 5
fi

# 数据库初始化
echo "🔄 Initializing database..."

# 确保数据目录存在
mkdir -p /app/data
chmod 755 /app/data

# 检查数据库状态
DB_FILE="/app/data/webhook.db"
NEED_INIT=false

echo "🔍 Checking database status..."

# 检查数据库文件是否存在且有内容
if [ ! -f "$DB_FILE" ]; then
    echo "📝 Database file not found, will create new database"
    NEED_INIT=true
elif [ ! -s "$DB_FILE" ]; then
    echo "📝 Database file is empty, will initialize"
    NEED_INIT=true
else
    # 检查是否有admins表
    echo "🔍 Checking for admins table..."
    if npx prisma db execute --stdin <<< "SELECT name FROM sqlite_master WHERE type='table' AND name='admins';" 2>/dev/null | grep -q "admins"; then
        echo "✅ Database and admins table exist"
        # 尝试运行迁移（如果有的话）
        if npx prisma migrate deploy 2>/dev/null; then
            echo "✅ Database migrations applied successfully"
        else
            echo "ℹ️  No pending migrations to apply"
        fi
    else
        echo "⚠️  Database exists but missing admins table, will reinitialize"
        NEED_INIT=true
    fi
fi

# 如果需要初始化数据库
if [ "$NEED_INIT" = true ]; then
    echo "🔧 Initializing database schema..."

    # 删除旧数据库文件（如果存在）
    rm -f "$DB_FILE"

    # 推送完整的schema
    echo "📤 Pushing database schema..."
    if npx prisma db push --accept-data-loss; then
        echo "✅ Database schema initialized successfully"

        # 验证admins表是否创建成功
        if npx prisma db execute --stdin <<< "SELECT name FROM sqlite_master WHERE type='table' AND name='admins';" 2>/dev/null | grep -q "admins"; then
            echo "✅ Admins table created successfully"
        else
            echo "❌ Failed to create admins table"
            exit 1
        fi
    else
        echo "❌ Failed to initialize database schema"
        exit 1
    fi
fi

# Prisma客户端已在构建时生成，跳过重新生成以避免权限问题
echo "✅ Using pre-generated Prisma client from build stage"

echo "🎯 Starting application..."

# 启动应用
exec "$@"
