const mongoose = require('mongoose');
const dns = require('dns');

// Force IPv4 DNS resolution (fixes issues with broken IPv6 DNS resolvers)
dns.setDefaultResultOrder('ipv4first');

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.error('Check: 1) Your IP is whitelisted in Atlas Network Access');
    console.error('       2) Username/password are correct');
    console.error('       3) Cluster is active and not paused');
    process.exit(1);
  }
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});

module.exports = connectDB;
