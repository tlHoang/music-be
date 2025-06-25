// Quick database check script
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    return;
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    const db = client.db();

    console.log('\n=== DATABASE CHECK ===');

    // Check subscriptions
    const subscriptions = await db
      .collection('subscriptions')
      .find({})
      .toArray();
    console.log('\n📋 Subscriptions found:', subscriptions.length);
    subscriptions.forEach((sub, index) => {
      console.log(
        `${index + 1}. User: ${sub.userId}, Plan: ${sub.plan}, Status: ${sub.status}, Payment: ${sub.paymentId}, Created: ${sub.createdAt}`,
      );
    });

    // Check payment order maps
    const paymentMaps = await db
      .collection('paymentordermaps')
      .find({})
      .toArray();
    console.log('\n💳 Payment Order Maps found:', paymentMaps.length);
    paymentMaps.forEach((map, index) => {
      console.log(
        `${index + 1}. OrderCode: ${map.orderCode}, User: ${map.userId}, Plan: ${map.plan}, Created: ${map.createdAt}`,
      );
    });

    // Check recent users
    const users = await db.collection('users').find({}).limit(3).toArray();
    console.log('\n👥 Sample Users found:', users.length);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}, Email: ${user.email}`);
    });
  } catch (error) {
    console.error('Database check error:', error);
  } finally {
    await client.close();
  }
}

checkDatabase();
