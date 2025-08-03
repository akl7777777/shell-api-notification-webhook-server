#!/bin/bash

# Webhook 测试脚本

SERVER_URL=${1:-"http://localhost:3000"}
WEBHOOK_SECRET=${2:-""}

echo "🧪 测试 Webhook 服务器: $SERVER_URL"

# 测试健康检查
echo "📊 测试健康检查..."
curl -s "$SERVER_URL/health" | jq .

echo ""

# 测试 webhook 端点
echo "📨 发送测试 webhook 消息..."

# 构建测试消息
TEST_MESSAGE='{
  "type": "test",
  "title": "测试消息",
  "content": "这是一条测试消息，用于验证 webhook 服务器是否正常工作。当前时间: {{value}}",
  "values": ["'$(date)'"],
  "timestamp": '$(date +%s)'
}'

echo "📝 消息内容:"
echo "$TEST_MESSAGE" | jq .

echo ""

# 发送请求
if [ -n "$WEBHOOK_SECRET" ]; then
    echo "🔐 使用签名验证..."
    # 生成签名
    SIGNATURE=$(echo -n "$TEST_MESSAGE" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | cut -d' ' -f2)
    
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "X-Webhook-Signature: $SIGNATURE" \
        -H "Authorization: Bearer $WEBHOOK_SECRET" \
        -d "$TEST_MESSAGE" \
        "$SERVER_URL/webhook")
else
    echo "🔓 不使用签名验证..."
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$TEST_MESSAGE" \
        "$SERVER_URL/webhook")
fi

# 解析响应
HTTP_CODE=$(echo "$RESPONSE" | tail -n1 | cut -d':' -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

echo "📥 响应状态码: $HTTP_CODE"
echo "📄 响应内容:"
echo "$RESPONSE_BODY" | jq .

echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Webhook 测试成功！"
    
    # 测试查询 API
    echo "🔍 测试查询 API..."
    curl -s "$SERVER_URL/api/webhooks?pageSize=5" | jq .
    
    echo ""
    echo "📊 测试统计 API..."
    curl -s "$SERVER_URL/api/webhooks/stats" | jq .
    
else
    echo "❌ Webhook 测试失败！"
    exit 1
fi

echo ""
echo "🌐 Web 界面地址: $SERVER_URL"
echo "🔗 Webhook 端点: $SERVER_URL/webhook"
echo "📡 API 端点: $SERVER_URL/api"
