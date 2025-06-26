/**
 * Script to create MongoDB Atlas Vector Search Index
 * Run this script to set up the vector search index for lyrics
 *
 * Prerequisites:
 * 1. MongoDB Atlas cluster (M0+ with Vector Search support)
 * 2. Database: (your database name)
 * 3. Collection: songs
 *
 * You can run this via MongoDB Atlas UI or MongoDB shell
 */

// Vector Search Index Definition
const vectorSearchIndexDefinition = {
  name: 'lyrics_vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'lyricsEmbedding',
        numDimensions: 1024, // Cohere embedding dimension
        similarity: 'cosine',
      },
      {
        type: 'filter',
        path: 'isFlagged',
      },
      {
        type: 'filter',
        path: 'lyrics',
      },
      {
        type: 'filter',
        path: 'visibility',
      },
    ],
  },
};

console.log('Vector Search Index Definition:');
console.log(JSON.stringify(vectorSearchIndexDefinition, null, 2));

console.log('\n=== HOW TO CREATE THE INDEX ===');
console.log('1. Go to MongoDB Atlas Dashboard');
console.log('2. Navigate to your cluster');
console.log('3. Go to "Search" tab');
console.log('4. Click "Create Search Index"');
console.log('5. Choose "JSON Editor"');
console.log('6. Paste the above JSON definition');
console.log('7. Set Collection Name: "songs"');
console.log('8. Click "Create Search Index"');

console.log('\n=== OR USE MONGODB SHELL ===');
console.log('Run this command in MongoDB shell:');
console.log(`
db.songs.createSearchIndex(
  "lyrics_vector_index",
  {
    "mappings": {
      "dynamic": false,
      "fields": {
        "lyricsEmbedding": {
          "type": "knnVector",
          "dimensions": 1024,
          "similarity": "cosine"
        },
        "isFlagged": {
          "type": "boolean"
        },
        "lyrics": {
          "type": "string"
        },
        "visibility": {
          "type": "string"
        }
      }
    }
  }
)
`);

console.log('\n=== VERIFICATION ===');
console.log('After creating the index, test it with:');
console.log('GET /songs/search/lyrics?q=love&limit=5');
