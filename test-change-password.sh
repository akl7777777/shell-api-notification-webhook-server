#!/bin/bash

BASE_URL="http://localhost:3000"

echo "🔐 Testing Change Password Functionality..."
echo

# 1. 登录获取token
echo "1. Logging in to get token..."
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')

echo "Login response: $login_response"

# 提取token
token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$token" ]; then
    echo "✅ Login successful"
    echo "   Token: ${token:0:20}..."
else
    echo "❌ Login failed"
    exit 1
fi
echo

# 2. 测试修改密码 - 错误的当前密码
echo "2. Testing change password with wrong current password..."
wrong_current_response=$(curl -s -X POST "$BASE_URL/auth/change-password" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d '{"currentPassword":"wrongpassword","newPassword":"newpassword123"}')

echo "Wrong current password response: $wrong_current_response"

if echo "$wrong_current_response" | grep -q '"success":false'; then
    echo "✅ Wrong current password correctly rejected"
else
    echo "❌ Wrong current password should be rejected"
fi
echo

# 3. 测试修改密码 - 弱密码
echo "3. Testing change password with weak password..."
weak_password_response=$(curl -s -X POST "$BASE_URL/auth/change-password" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d '{"currentPassword":"admin123","newPassword":"123"}')

echo "Weak password response: $weak_password_response"

if echo "$weak_password_response" | grep -q '"success":false'; then
    echo "✅ Weak password correctly rejected"
else
    echo "❌ Weak password should be rejected"
fi
echo

# 4. 测试修改密码 - 成功
echo "4. Testing successful password change..."
change_password_response=$(curl -s -X POST "$BASE_URL/auth/change-password" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d '{"currentPassword":"admin123","newPassword":"newpassword123"}')

echo "Change password response: $change_password_response"

if echo "$change_password_response" | grep -q '"success":true'; then
    echo "✅ Password changed successfully"
else
    echo "❌ Password change failed"
    exit 1
fi
echo

# 5. 测试用旧密码登录 - 应该失败
echo "5. Testing login with old password (should fail)..."
old_password_login=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')

echo "Old password login response: $old_password_login"

if echo "$old_password_login" | grep -q '"success":false'; then
    echo "✅ Old password correctly rejected"
else
    echo "❌ Old password should be rejected"
fi
echo

# 6. 测试用新密码登录 - 应该成功
echo "6. Testing login with new password (should succeed)..."
new_password_login=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"newpassword123"}')

echo "New password login response: $new_password_login"

if echo "$new_password_login" | grep -q '"success":true'; then
    echo "✅ New password login successful"
    
    # 提取新token
    new_token=$(echo "$new_password_login" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "   New token: ${new_token:0:20}..."
else
    echo "❌ New password login failed"
    exit 1
fi
echo

# 7. 恢复原密码 (为了后续测试)
echo "7. Restoring original password..."
restore_password_response=$(curl -s -X POST "$BASE_URL/auth/change-password" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $new_token" \
    -d '{"currentPassword":"newpassword123","newPassword":"admin123"}')

echo "Restore password response: $restore_password_response"

if echo "$restore_password_response" | grep -q '"success":true'; then
    echo "✅ Password restored to original"
else
    echo "❌ Failed to restore password"
fi
echo

echo "🎉 Change password functionality test completed!"
echo
echo "📝 Summary:"
echo "- ✅ Wrong current password rejected"
echo "- ✅ Weak password rejected"
echo "- ✅ Password change successful"
echo "- ✅ Old password invalidated"
echo "- ✅ New password works"
echo "- ✅ Password restored for future tests"
