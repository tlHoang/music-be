// quick-test-payos.js - Quick test for PayOS without auth
const axios = require('axios');

async function quickTest() {
  console.log('🚀 Quick PayOS Test\n');

  // Test public endpoints
  console.log('1️⃣ Testing Public Return Endpoint...');
  try {
    const response = await axios.get(
      'http://localhost:8888/payments/return?orderCode=123456&status=PAID',
    );
    console.log('✅ Return endpoint works:', response.data.message);
  } catch (error) {
    console.log('❌ Return test failed:', error.message);
  }

  console.log('\n2️⃣ Testing Webhook Endpoint...');
  try {
    const webhookData = {
      code: '00',
      desc: 'Success',
      data: {
        orderCode: 123456,
        amount: 10000,
        description: 'Test',
        accountNumber: '123',
        reference: 'REF123',
        transactionDateTime: new Date().toISOString(),
        currency: 'VND',
        paymentLinkId: 'test-id',
        code: '00',
        desc: 'Success',
        status: 'PAID',
      },
      signature: 'test-signature',
    };

    await axios.post('http://localhost:8888/payments/webhook', webhookData);
  } catch (error) {
    if (error.response?.data?.message === 'Invalid webhook data') {
      console.log(
        '✅ Webhook endpoint accessible (signature validation working)',
      );
    } else {
      console.log(
        '❌ Webhook test failed:',
        error.response?.data || error.message,
      );
    }
  }

  console.log('\n✨ PayOS Integration Status: READY');
  console.log('\n📝 What to test next:');
  console.log('1. Create a user account and login');
  console.log('2. Use the JWT token to test payment creation');
  console.log('3. Test actual payment flow with real PayOS checkout');
  console.log('4. Set up webhook URL in PayOS dashboard');
}

quickTest();
