// Webhook simulator to test subscription creation
require('dotenv').config();
const axios = require('axios');

async function simulateWebhook() {
  console.log('🔄 Simulating PayOS webhook...');

  // Use one of the existing order codes from the database
  const orderCode = 1750728541925; // Latest order from the database check

  const webhookData = {
    code: '00',
    desc: 'success',
    success: true,
    data: {
      orderCode: orderCode,
      amount: 10000,
      description: 'CSOAT5K00P1 Premium Plan 1 months',
      accountNumber: '0914585619',
      reference: `CSOAT5K00P1 Premium Plan 1 months`,
      transactionDateTime: new Date().toISOString(),
      currency: 'VND',
      paymentLinkId: 'test-payment-link-id',
      code: '00',
      desc: 'success',
      status: 'PAID', // This is the key status that triggers subscription creation
    },
    signature: 'test-signature', // PayOS would include a real signature
  };

  try {
    const response = await axios.post(
      'http://localhost:8888/payments/webhook',
      webhookData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Webhook response:', response.status, response.data);
  } catch (error) {
    console.error('❌ Webhook error:', error.response?.data || error.message);
  }
}

simulateWebhook();
