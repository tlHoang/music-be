/**
 * Test script for MongoDB Atlas Vector Search
 * Tests both Atlas Vector Search and fallback methods
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testVectorSearch() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db();
    const collection = db.collection('songs');

    // Test if vector search index exists
    console.log('\n=== Testing Vector Search Index ===');

    try {
      const testQuery = [0.1, 0.2, 0.3]; // Dummy embedding for testing
      const pipeline = [
        {
          $vectorSearch: {
            index: 'lyrics_vector_index',
            path: 'lyricsEmbedding',
            queryVector: Array(1024).fill(0.1), // 1024-dimensional dummy vector
            numCandidates: 100,
            limit: 5,
          },
        },
        { $limit: 1 },
      ];

      const result = await collection.aggregate(pipeline).toArray();
      console.log('✅ Vector Search Index is working!');
      console.log(`Found ${result.length} result(s)`);
    } catch (vectorError) {
      console.log('❌ Vector Search Index not found or not working:');
      console.log(vectorError.message);
      console.log(
        '\nPlease create the vector search index using the instructions in create-vector-index.js',
      );
    }

    // Check if songs have embeddings
    console.log('\n=== Checking Embeddings ===');
    const songsWithEmbeddings = await collection.countDocuments({
      lyricsEmbedding: { $exists: true, $ne: null },
    });

    const totalSongs = await collection.countDocuments({
      lyrics: { $exists: true, $ne: null },
    });

    console.log(`Songs with embeddings: ${songsWithEmbeddings}`);
    console.log(`Total songs with lyrics: ${totalSongs}`);

    if (songsWithEmbeddings === 0) {
      console.log(
        '⚠️  No songs have embeddings yet. Upload a song with lyrics to generate embeddings.',
      );
    }
  } catch (error) {
    console.error('Error testing vector search:', error);
  } finally {
    await client.close();
  }
}

// Run the test
testVectorSearch().catch(console.error);
