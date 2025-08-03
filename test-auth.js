#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3000';

async function testAuthentication() {
  console.log('🧪 Testing Authentication System...\n');

  try {
    // 1. 测试未认证访问API
    console.log('1. Testing unauthenticated API access...');
    try {
      await axios.get(`${BASE_URL}/api/webhooks`);
      console.log('❌ ERROR: API should require authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ API correctly requires authentication');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // 2. 测试登录
    console.log('\n2. Testing login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      console.log('   Token:', loginResponse.data.token.substring(0, 20) + '...');
      console.log('   User:', loginResponse.data.user.username);
    } else {
      console.log('❌ Login failed:', loginResponse.data.error);
      return;
    }

    const token = loginResponse.data.token;

    // 3. 测试认证后的API访问
    console.log('\n3. Testing authenticated API access...');
    try {
      const apiResponse = await axios.get(`${BASE_URL}/api/webhooks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Authenticated API access successful');
      console.log('   Response status:', apiResponse.status);
    } catch (error) {
      console.log('❌ Authenticated API access failed:', error.message);
    }

    // 4. 测试token验证
    console.log('\n4. Testing token verification...');
    try {
      const verifyResponse = await axios.get(`${BASE_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Token verification successful');
      console.log('   Valid:', verifyResponse.data.valid);
      console.log('   User:', verifyResponse.data.user?.username);
    } catch (error) {
      console.log('❌ Token verification failed:', error.message);
    }

    // 5. 测试无效token
    console.log('\n5. Testing invalid token...');
    try {
      await axios.get(`${BASE_URL}/api/webhooks`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      console.log('❌ ERROR: Invalid token should be rejected');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Invalid token correctly rejected');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // 6. 测试错误的登录凭据
    console.log('\n6. Testing wrong credentials...');
    try {
      const wrongLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'admin',
        password: 'wrongpassword'
      });
      if (!wrongLoginResponse.data.success) {
        console.log('✅ Wrong credentials correctly rejected');
        console.log('   Error:', wrongLoginResponse.data.error);
      } else {
        console.log('❌ ERROR: Wrong credentials should be rejected');
      }
    } catch (error) {
      console.log('✅ Wrong credentials correctly rejected');
    }

    console.log('\n🎉 Authentication system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// 运行测试
testAuthentication();
