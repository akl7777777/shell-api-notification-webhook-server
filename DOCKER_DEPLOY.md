# Docker 一键部署指南

## 🚀 快速开始

### 1. 克隆项目并进入目录
```bash
git clone <your-repo>
cd webhook-server
```

### 2. 一键启动
```bash
./start.sh
```

就这么简单！服务将在 http://localhost:7392 启动（生产模式）。

## 📋 支持的数据库类型

✅ **SQLite** - 默认，无需额外配置  
✅ **PostgreSQL** - 远程数据库  
✅ **MySQL** - 远程数据库  
✅ **Elasticsearch** - 远程搜索引擎  

## ⚙️ 配置远程数据库

### 1. 复制配置文件
```bash
cp .env.docker .env
```

### 2. 编辑 `.env` 文件

#### PostgreSQL 示例
```bash
PRIMARY_STORAGE_TYPE=postgresql
PRIMARY_STORAGE_HOST=your-postgres-host.com
PRIMARY_STORAGE_PORT=5432
PRIMARY_STORAGE_DATABASE=webhook_db
PRIMARY_STORAGE_USERNAME=webhook_user
PRIMARY_STORAGE_PASSWORD=your-password
PRIMARY_STORAGE_SSL=true
```

#### MySQL 示例
```bash
PRIMARY_STORAGE_TYPE=mysql
PRIMARY_STORAGE_HOST=your-mysql-host.com
PRIMARY_STORAGE_PORT=3306
PRIMARY_STORAGE_DATABASE=webhook_db
PRIMARY_STORAGE_USERNAME=webhook_user
PRIMARY_STORAGE_PASSWORD=your-password
```

#### Elasticsearch 示例
```bash
PRIMARY_STORAGE_TYPE=elasticsearch
PRIMARY_STORAGE_HOST=your-es-host.com
PRIMARY_STORAGE_PORT=9200
PRIMARY_STORAGE_USERNAME=elastic
PRIMARY_STORAGE_PASSWORD=your-password
PRIMARY_STORAGE_SSL=true
PRIMARY_STORAGE_INDEX=webhook-messages
```

### 3. 启动服务
```bash
./start.sh
```

## 🛠️ 启动脚本选项

```bash
./start.sh              # 默认启动
./start.sh -d            # 开发模式
./start.sh -p            # 生产模式
./start.sh -s            # 停止服务
./start.sh -r            # 重启服务
./start.sh -l            # 查看日志
./start.sh --build       # 重新构建镜像
./start.sh --clean       # 清理所有数据
./start.sh -h            # 显示帮助
```

## 🔧 高级配置

### 备用存储（故障转移）
```bash
# 主存储使用 Elasticsearch，备用使用 PostgreSQL
PRIMARY_STORAGE_TYPE=elasticsearch
PRIMARY_STORAGE_HOST=es-host.com
# ... ES 配置

ENABLE_FALLBACK_STORAGE=true
FALLBACK_STORAGE_TYPE=postgresql
FALLBACK_STORAGE_HOST=pg-host.com
# ... PostgreSQL 配置
```

### Redis 队列（高并发）
```bash
ENABLE_QUEUE=true
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

## 🌐 云服务配置示例

### AWS RDS PostgreSQL
```bash
PRIMARY_STORAGE_TYPE=postgresql
PRIMARY_STORAGE_HOST=mydb.region.rds.amazonaws.com
PRIMARY_STORAGE_PORT=5432
PRIMARY_STORAGE_DATABASE=webhook_db
PRIMARY_STORAGE_USERNAME=webhook_user
PRIMARY_STORAGE_PASSWORD=your-password
PRIMARY_STORAGE_SSL=true
```

### Google Cloud SQL MySQL
```bash
PRIMARY_STORAGE_TYPE=mysql
PRIMARY_STORAGE_HOST=your-ip-address
PRIMARY_STORAGE_PORT=3306
PRIMARY_STORAGE_DATABASE=webhook_db
PRIMARY_STORAGE_USERNAME=webhook_user
PRIMARY_STORAGE_PASSWORD=your-password
PRIMARY_STORAGE_SSL=true
```

### Elasticsearch Cloud
```bash
PRIMARY_STORAGE_TYPE=elasticsearch
PRIMARY_STORAGE_HOST=your-deployment.es.region.cloud.es.io
PRIMARY_STORAGE_PORT=9243
PRIMARY_STORAGE_USERNAME=elastic
PRIMARY_STORAGE_PASSWORD=your-password
PRIMARY_STORAGE_SSL=true
```

## 📊 监控和维护

### 查看服务状态
```bash
docker-compose ps
```

### 查看日志
```bash
./start.sh -l
# 或
docker-compose logs -f
```

### 健康检查
```bash
curl http://localhost:7392/api/health
```

### 备份数据（SQLite）
```bash
docker-compose exec webhook-server cp /app/data/webhook.db /app/logs/backup-$(date +%Y%m%d).db
```

## 🔒 安全建议

1. **修改默认密钥**
   ```bash
   WEBHOOK_SECRET=your-strong-secret-key
   ```

2. **使用 HTTPS**
   - 在反向代理（如 Nginx）中配置 SSL
   - 设置 `PRIMARY_STORAGE_SSL=true`

3. **网络安全**
   - 限制数据库访问 IP
   - 使用 VPN 或私有网络

4. **定期备份**
   - 设置自动备份脚本
   - 测试恢复流程

## 🐛 故障排除

### 服务无法启动
```bash
# 查看详细日志
docker-compose logs webhook-server

# 检查配置
cat .env

# 重新构建
./start.sh --build
```

### 数据库连接失败
1. 检查网络连接
2. 验证数据库凭据
3. 确认防火墙设置
4. 检查 SSL 配置

### 端口冲突
```bash
# 修改端口
echo "PORT=7393" >> .env
./start.sh -r
```

## 📞 支持

如有问题，请检查：
1. Docker 和 Docker Compose 版本
2. 网络连接
3. 数据库配置
4. 日志文件

更多详细配置请参考 `ELASTICSEARCH_SETUP.md`。
