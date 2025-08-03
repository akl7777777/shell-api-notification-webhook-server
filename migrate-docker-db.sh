#!/bin/bash

echo "🔄 Running database migration in Docker container..."
echo

# 获取容器名称
CONTAINER_NAME=$(docker compose ps --services | head -1)
if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ No running containers found. Please start the service first:"
    echo "   docker compose up -d"
    exit 1
fi

echo "📦 Found container: $CONTAINER_NAME"

# 检查容器是否运行
if ! docker compose ps | grep -q "Up"; then
    echo "⚠️  Container is not running. Starting..."
    docker compose up -d
    sleep 5
fi

echo "🔧 Running Prisma migration..."

# 在容器中执行数据库迁移
docker compose exec $CONTAINER_NAME sh -c "
    echo '🔄 Generating Prisma client...'
    npx prisma generate

    echo '🔄 Pushing database schema...'
    npx prisma db push --accept-data-loss

    echo '✅ Migration completed!'
"

if [ $? -eq 0 ]; then
    echo "✅ Database migration successful!"
    
    # 重启容器以应用更改
    echo "🔄 Restarting container..."
    docker compose restart
    
    echo "⏳ Waiting for service to start..."
    sleep 10
    
    # 检查服务状态
    echo "📊 Service status:"
    docker compose ps
    
    echo
    echo "🎉 Migration completed successfully!"
    echo
    echo "📝 You can now:"
    echo "1. Check logs: docker compose logs -f"
    echo "2. Test API: curl http://localhost:3000/api/health"
    echo "3. Access web: http://localhost:3000"
    
else
    echo "❌ Migration failed!"
    echo
    echo "🔍 Troubleshooting:"
    echo "1. Check container logs: docker compose logs"
    echo "2. Try rebuilding: docker compose build --no-cache"
    echo "3. Reset database: docker compose down -v && docker compose up -d"
fi
