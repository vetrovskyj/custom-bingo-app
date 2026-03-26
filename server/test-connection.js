require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
console.log('URI loaded:', uri ? uri.substring(0, 40) + '...' : 'NOT SET');
console.log('Attempting connection...');

mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log('=== SUCCESS: Connected to MongoDB! ===');
    process.exit(0);
  })
  .catch((err) => {
    console.error('=== CONNECTION FAILED ===');
    console.error('Message:', err.message);
    if (err.reason) {
      console.error('Reason:', err.reason.message);
      console.error('Type:', err.reason.type);
    }
    if (err.code) {
      console.error('Code:', err.code);
    }
    process.exit(1);
  });
