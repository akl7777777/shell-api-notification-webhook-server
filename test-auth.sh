#!/bin/bash

BASE_URL="http://localhost:3000"

echo "🧪 Testing Authentication System..."
echo

# 1. 测试未认证访问API
echo "1. Testing unauthenticated API access..."
response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/webhooks")
if [ "$response" = "401" ]; then
    echo "✅ API correctly requires authentication (401)"
else
    echo "❌ Expected 401, got $response"
fi
echo

# 2. 测试登录
echo "2. Testing login..."
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')

echo "Login response: $login_response"

# 提取token (简单的JSON解析)
token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$token" ]; then
    echo "✅ Login successful"
    echo "   Token: ${token:0:20}..."
else
    echo "❌ Login failed"
    exit 1
fi
echo

# 3. 测试认证后的API访问
echo "3. Testing authenticated API access..."
auth_response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/webhooks" \
    -H "Authorization: Bearer $token")

if [ "$auth_response" = "200" ]; then
    echo "✅ Authenticated API access successful (200)"
else
    echo "❌ Expected 200, got $auth_response"
fi
echo

# 4. 测试token验证
echo "4. Testing token verification..."
verify_response=$(curl -s "$BASE_URL/auth/verify" \
    -H "Authorization: Bearer $token")

echo "Verify response: $verify_response"
echo

# 5. 测试无效token
echo "5. Testing invalid token..."
invalid_response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/webhooks" \
    -H "Authorization: Bearer invalid-token")

if [ "$invalid_response" = "401" ]; then
    echo "✅ Invalid token correctly rejected (401)"
else
    echo "❌ Expected 401, got $invalid_response"
fi
echo

# 6. 测试错误的登录凭据
echo "6. Testing wrong credentials..."
wrong_login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrongpassword"}')

echo "Wrong login response: $wrong_login_response"

if echo "$wrong_login_response" | grep -q '"success":false'; then
    echo "✅ Wrong credentials correctly rejected"
else
    echo "❌ Wrong credentials should be rejected"
fi
echo

echo "🎉 Authentication system test completed!"
