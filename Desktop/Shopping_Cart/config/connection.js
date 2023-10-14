const { MongoClient } = require('mongodb');
const state = {
  db: null
};

module.exports.connect = async function() {
  const url = 'mongodb://127.0.0.1:27017';
  const dbName = 'shopping';

  try {
    const client = await MongoClient.connect(url);
    state.db = client.db(dbName);
    console.log('Database connected');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    throw err;
  }
};

module.exports.get = function() {
  return state.db;
};
