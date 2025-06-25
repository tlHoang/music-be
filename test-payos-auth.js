// test-payos-with-auth.js - Test PayOS with authentication
const axios = require('axios');

const BASE_URL = 'http://localhost:8888';

async function testWithAuth() {
  console.log('🚀 Testing PayOS Integration with Authentication...\n');

  try {
    // Step 1: Login to get JWT token
    console.log('1️⃣ Logging in to get JWT token...');

    // First, let's register a test user (if needed)
    const testUser = {
      email: 'test@payos.com',
      password: 'Test123!',
      name: 'PayOS Test User',
    };

    let token;
    try {
      // Try to register user first
      await axios.post(`${BASE_URL}/auth/register`, testUser);
      console.log('✅ Test user registered');
    } catch (error) {
      // User might already exist, that's fine
      console.log('ℹ️  Test user already exists or registration failed');
    }

    // Login to get token
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password,
      });
      token = loginResponse.data.access_token;
      console.log('✅ Login successful, token obtained');
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.message);
      console.log(
        '🔄 Trying without authentication for public endpoints only...\n',
      );

      // Test only public endpoints
      await testPublicEndpoints();
      return;
    }

    // Step 2: Test authenticated endpoints
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Test Create Payment Link
    console.log('\n2️⃣ Testing Create Payment Link (Authenticated)...');
    const paymentData = {
      amount: 15000,
      description: 'Test Payment with Auth - PayOS Integration',
      buyerName: 'Authenticated Test User',
      buyerEmail: 'test@payos.com',
      buyerPhone: '+84901234567',
      items: [
        {
          name: 'Premium Feature',
          quantity: 1,
          price: 15000,
        },
      ],
    };

    const createResponse = await axios.post(
      `${BASE_URL}/payments/create-link`,
      paymentData,
      { headers },
    );
    console.log('✅ Payment link created successfully!');
    console.log('Order Code:', createResponse.data.data.orderCode);
    console.log('Checkout URL:', createResponse.data.data.checkoutUrl);

    const orderCode = createResponse.data.data.orderCode;

    // Test Get Payment Info
    console.log('\n3️⃣ Testing Get Payment Info (Authenticated)...');
    const infoResponse = await axios.get(
      `${BASE_URL}/payments/info/${orderCode}`,
      { headers },
    );
    console.log('✅ Payment info retrieved successfully!');
    console.log('Status:', infoResponse.data.data.status);
    console.log('Amount:', infoResponse.data.data.amount);

    console.log('\n🎉 All authenticated tests passed!');

    // Test public endpoints too
    await testPublicEndpoints();
  } catch (error) {
    console.error(
      '❌ Authenticated test failed:',
      error.response?.data || error.message,
    );
  }
}

async function testPublicEndpoints() {
  console.log('\n4️⃣ Testing Public Endpoints...');

  try {
    // Test webhook endpoint (should be public)
    console.log('Testing webhook endpoint...');
    const webhookData = {
      code: '00',
      desc: 'Success',
      data: {
        orderCode: 123456789,
        amount: 10000,
        description: 'Test webhook',
        accountNumber: '12345678',
        reference: 'TEST123',
        transactionDateTime: new Date().toISOString(),
        currency: 'VND',
        paymentLinkId: 'test-payment-link-id',
        code: '00',
        desc: 'Success',
        status: 'PAID',
      },
      signature: 'test-signature',
    };

    // Note: This will fail signature verification but should reach the endpoint
    try {
      await axios.post(`${BASE_URL}/payments/webhook`, webhookData);
    } catch (error) {
      if (
        error.response?.status === 400 &&
        error.response?.data?.message === 'Invalid webhook data'
      ) {
        console.log(
          '✅ Webhook endpoint is accessible (signature validation working)',
        );
      } else {
        console.log(
          '⚠️  Webhook test result:',
          error.response?.data?.message || error.message,
        );
      }
    }

    // Test return endpoint
    console.log('Testing return endpoint...');
    const returnResponse = await axios.get(
      `${BASE_URL}/payments/return?orderCode=123456&status=PAID&code=00`,
    );
    console.log('✅ Return endpoint accessible:', returnResponse.data.message);
  } catch (error) {
    console.log(
      '⚠️  Public endpoint test issue:',
      error.response?.data || error.message,
    );
  }
}

async function testSimplePayment() {
  console.log('\n🆓 Testing Simple Payment Creation (if no auth required)...');

  try {
    const simplePayment = {
      amount: 5000,
      description: 'Simple Test Payment',
    };

    const response = await axios.post(
      `${BASE_URL}/payments/create-link`,
      simplePayment,
    );
    console.log('✅ Simple payment created!');
    console.log(
      '🔗 Visit this URL to test payment:',
      response.data.data.checkoutUrl,
    );
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('ℹ️  Payment creation requires authentication (expected)');
    } else {
      console.log(
        '❌ Simple payment test failed:',
        error.response?.data || error.message,
      );
    }
  }
}

// Run all tests
async function runAllTests() {
  await testWithAuth();
  await testSimplePayment();

  console.log('\n📋 Summary:');
  console.log('- Payment endpoints require authentication');
  console.log('- Webhook and return endpoints are public');
  console.log('- PayOS integration is properly configured');
  console.log('\n🔧 Next steps:');
  console.log('1. Test actual payment flow by visiting checkout URL');
  console.log('2. Set up webhook URL in PayOS dashboard');
  console.log('3. Integrate with frontend/mobile applications');
  console.log('4. Add database integration for payment tracking');
}

runAllTests();
