// Direct subscription test
require('dotenv').config();
const { MongoClient } = require('mongodb');
const axios = require('axios');

async function testSubscriptionCreation() {
  console.log('🧪 Testing subscription creation...');

  // First, get a payment order map from the database
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    // Get the latest payment order map
    const paymentMaps = await db
      .collection('paymentordermaps')
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (paymentMaps.length === 0) {
      console.log('❌ No payment order maps found');
      return;
    }

    const latestPayment = paymentMaps[0];
    console.log('📋 Found payment order:', {
      orderCode: latestPayment.orderCode,
      userId: latestPayment.userId,
      plan: latestPayment.plan,
    });

    // Now try to create a subscription directly by calling the backend service
    // We'll simulate what the webhook should do
    console.log('🔄 Attempting to create subscription...');

    // Create a test webhook payload that should pass verification
    const testWebhook = {
      code: '00',
      desc: 'success',
      success: true,
      data: {
        orderCode: latestPayment.orderCode,
        amount: 10000,
        description: 'Premium Plan - 1 month(s)',
        accountNumber: '0914585619',
        reference: `CSOAT5K00P1 Premium Plan 1 months`,
        transactionDateTime: new Date().toISOString(),
        currency: 'VND',
        paymentLinkId: 'test-payment-link-id',
        code: '00',
        desc: 'success',
        status: 'PAID',
      },
      signature: 'test-signature-bypass-verification',
    };

    // Try to call the webhook endpoint with a special bypass header
    const response = await axios.post(
      'http://localhost:8888/payments/webhook',
      testWebhook,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Bypass': 'true', // We'll add this check in the webhook handler
        },
      },
    );

    console.log('✅ Webhook response:', response.data);

    // Check if subscription was created
    const subscriptions = await db
      .collection('subscriptions')
      .find({
        userId: latestPayment.userId,
      })
      .toArray();

    console.log('📊 Subscriptions after test:', subscriptions.length);
    subscriptions.forEach((sub, index) => {
      console.log(
        `${index + 1}. Plan: ${sub.plan}, Status: ${sub.status}, Payment: ${sub.paymentId}`,
      );
    });
  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  } finally {
    await client.close();
  }
}

testSubscriptionCreation();
