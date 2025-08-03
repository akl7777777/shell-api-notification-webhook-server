# Elasticsearch 支持配置指南

## 概述

Webhook 服务器现在完全支持 Elasticsearch 作为存储后端，提供强大的搜索和分析功能。

## 功能特性

✅ **完整的 CRUD 操作** - 创建、读取、更新、删除 webhook 消息
✅ **高级搜索** - 支持全文搜索、模糊匹配、多字段查询
✅ **聚合统计** - 按类型统计、时间范围分析
✅ **批量操作** - 高效的批量插入和更新
✅ **健康检查** - 实时监控 ES 集群状态
✅ **故障转移** - 支持备用存储适配器
✅ **索引管理** - 自动创建和配置索引

## 快速开始

### 1. 启动 Elasticsearch

使用 Docker 快速启动：

```bash
# 启动单节点 ES 集群（开发环境）
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.0

# 验证 ES 是否运行
curl http://localhost:9200
```

### 2. 配置环境变量

在 `.env` 文件中设置：

```bash
# 主存储配置
PRIMARY_STORAGE_TYPE=elasticsearch
PRIMARY_STORAGE_HOST=localhost
PRIMARY_STORAGE_PORT=9200
PRIMARY_STORAGE_INDEX=webhook-messages
PRIMARY_STORAGE_TIMEOUT=30000

# 可选：启用认证
# PRIMARY_STORAGE_USERNAME=elastic
# PRIMARY_STORAGE_PASSWORD=your-password
# PRIMARY_STORAGE_SSL=true

# 可选：配置备用存储
ENABLE_FALLBACK_STORAGE=true
FALLBACK_STORAGE_TYPE=sqlite
FALLBACK_STORAGE_CONNECTION_STRING=file:./fallback.db
```

### 3. 启动服务器

```bash
npm run build
npm start
```

## 配置选项

### 基础配置

| 环境变量 | 描述 | 默认值 |
|---------|------|--------|
| `PRIMARY_STORAGE_TYPE` | 存储类型 | `sqlite` |
| `PRIMARY_STORAGE_HOST` | ES 主机地址 | `localhost` |
| `PRIMARY_STORAGE_PORT` | ES 端口 | `9200` |
| `PRIMARY_STORAGE_INDEX` | 索引名称 | `webhook-messages` |

### 高级配置

| 环境变量 | 描述 | 默认值 |
|---------|------|--------|
| `PRIMARY_STORAGE_CONNECTION_STRING` | 完整连接字符串 | - |
| `PRIMARY_STORAGE_USERNAME` | 用户名 | - |
| `PRIMARY_STORAGE_PASSWORD` | 密码 | - |
| `PRIMARY_STORAGE_SSL` | 启用 SSL | `false` |
| `PRIMARY_STORAGE_TIMEOUT` | 请求超时(ms) | `30000` |

### 故障转移配置

```bash
# 启用故障转移
ENABLE_FALLBACK_STORAGE=true

# 备用存储配置（推荐使用 SQLite 或 PostgreSQL）
FALLBACK_STORAGE_TYPE=sqlite
FALLBACK_STORAGE_CONNECTION_STRING=file:./backup.db
```

## 生产环境部署

### 1. ES 集群配置

```yaml
# docker-compose.yml
version: '3.8'
services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - cluster.name=webhook-cluster
      - node.name=webhook-node-1
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
      - xpack.security.enabled=true
      - ELASTIC_PASSWORD=your-strong-password
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data
    ulimits:
      memlock:
        soft: -1
        hard: -1

volumes:
  es_data:
```

### 2. 安全配置

```bash
# 生产环境配置
PRIMARY_STORAGE_TYPE=elasticsearch
PRIMARY_STORAGE_CONNECTION_STRING=https://your-es-cluster.com:9200
PRIMARY_STORAGE_USERNAME=webhook_user
PRIMARY_STORAGE_PASSWORD=secure-password
PRIMARY_STORAGE_SSL=true
PRIMARY_STORAGE_INDEX=production-webhooks
```

## 性能优化

### 1. 索引设置

系统会自动创建优化的索引配置：

- **分片数**: 1（单节点）或根据集群大小调整
- **副本数**: 0（开发）或 1+（生产）
- **自定义分析器**: 优化搜索性能
- **字段映射**: 针对 webhook 数据优化

### 2. 批量操作

```javascript
// 批量插入示例
const messages = [/* webhook messages */];
await storageAdapter.storeMessages(messages);
```

### 3. 搜索优化

```javascript
// 高级搜索示例
const results = await storageAdapter.searchMessages('error', {
  page: 1,
  pageSize: 50,
  type: 'github',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});
```

## 监控和维护

### 1. 健康检查

```bash
# 检查存储健康状态
curl http://localhost:3000/api/health
```

### 2. 索引管理

```bash
# 查看索引信息
curl http://localhost:9200/webhook-messages/_stats

# 查看索引映射
curl http://localhost:9200/webhook-messages/_mapping
```

### 3. 数据清理

```javascript
// 清理30天前的数据
await webhookService.cleanupOldMessages(30);
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查 ES 服务是否运行
   - 验证网络连接和端口
   - 检查认证配置

2. **索引创建失败**
   - 检查用户权限
   - 验证索引名称格式
   - 查看 ES 日志

3. **搜索性能问题**
   - 检查索引大小和分片配置
   - 优化查询条件
   - 考虑增加集群节点

### 日志调试

```bash
# 启用详细日志
DEBUG=webhook:* npm start
```

## 迁移指南

### 从 SQLite 迁移到 ES

1. 备份现有数据
2. 配置 ES 环境变量
3. 启动服务器（会自动创建索引）
4. 可选：编写数据迁移脚本

### 数据迁移脚本示例

```javascript
// migrate-to-es.js
const { WebhookService } = require('./dist/services/webhookService');

async function migrate() {
  // 实现数据迁移逻辑
  console.log('Migration completed');
}

migrate().catch(console.error);
```

## 支持

如有问题，请检查：
1. ES 服务器状态
2. 网络连接
3. 配置文件
4. 服务器日志

更多信息请参考 [Elasticsearch 官方文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)。
