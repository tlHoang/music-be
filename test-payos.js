// test-payos.js - Simple test script for PayOS endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:8888';

async function testPayOSEndpoints() {
  console.log('🚀 Testing PayOS Integration...\n');

  try {
    // Test 1: Create Payment Link
    console.log('1️⃣ Testing Create Payment Link...');
    const paymentData = {
      amount: 10000,
      description: 'Test Payment - PayOS Integration',
      buyerName: 'Test User',
      buyerEmail: 'test@example.com',
      buyerPhone: '+84901234567',
      items: [
        {
          name: 'Test Item',
          quantity: 1,
          price: 10000,
        },
      ],
    };

    const createResponse = await axios.post(
      `${BASE_URL}/payments/create-link`,
      paymentData,
    );
    console.log('✅ Payment link created successfully!');
    console.log('Order Code:', createResponse.data.data.orderCode);
    console.log('Checkout URL:', createResponse.data.data.checkoutUrl);
    console.log('QR Code:', createResponse.data.data.qrCode);

    const orderCode = createResponse.data.data.orderCode;

    // Test 2: Get Payment Info
    console.log('\n2️⃣ Testing Get Payment Info...');
    const infoResponse = await axios.get(
      `${BASE_URL}/payments/info/${orderCode}`,
    );
    console.log('✅ Payment info retrieved successfully!');
    console.log('Status:', infoResponse.data.data.status);
    console.log('Amount:', infoResponse.data.data.amount);

    // Test 3: Cancel Payment (optional)
    console.log('\n3️⃣ Testing Cancel Payment...');
    const cancelResponse = await axios.post(
      `${BASE_URL}/payments/cancel/${orderCode}`,
      {
        reason: 'Testing cancellation',
      },
    );
    console.log('✅ Payment cancelled successfully!');
    console.log('Cancel result:', cancelResponse.data.message);

    console.log(
      '\n🎉 All tests passed! PayOS integration is working correctly.',
    );
    console.log('\n📝 Next steps:');
    console.log('- Test the payment flow by visiting the checkout URL');
    console.log('- Integrate with frontend/mobile apps');
    console.log('- Set up webhook URL in PayOS dashboard');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);

    if (error.response?.status === 500) {
      console.log('\n🔍 Possible issues:');
      console.log('- Check PayOS credentials in .env file');
      console.log('- Verify PayOS account is active');
      console.log('- Check network connectivity');
    }
  }
}

// Run tests
testPayOSEndpoints();
