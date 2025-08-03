#!/bin/bash

echo "🔧 Fixing Docker database migration issue..."
echo

# 停止当前容器
echo "1. Stopping current containers..."
docker compose down

# 清理旧的数据卷（可选，会删除现有数据）
read -p "⚠️  Do you want to reset the database? This will delete all existing data. (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing old volumes..."
    docker compose down -v
    docker volume prune -f
fi

# 重新构建镜像
echo "2. Rebuilding Docker image..."
docker compose build --no-cache

# 启动服务
echo "3. Starting services..."
docker compose up -d

# 等待服务启动
echo "4. Waiting for services to start..."
sleep 10

# 检查服务状态
echo "5. Checking service status..."
docker compose ps

# 查看日志
echo "6. Checking logs..."
docker compose logs --tail=20

echo
echo "✅ Fix completed!"
echo
echo "📝 Next steps:"
echo "1. Check if the service is running: docker compose ps"
echo "2. View logs: docker compose logs -f"
echo "3. Test the service: curl http://localhost:3000/api/health"
echo "4. Access web interface: http://localhost:3000"
echo
echo "🔐 Default login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
