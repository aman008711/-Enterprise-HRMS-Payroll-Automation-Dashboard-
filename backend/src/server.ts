import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app';
import connectDB from './config/db';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  console.log(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
  console.error(`Unhandled Rejection: ${err.message || err}`);
  server.close(() => process.exit(1));
});

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  // 1. Close HTTP server (stops receiving new connections)
  server.close(async () => {
    console.log('Express HTTP server closed.');

    // 2. Close MongoDB connection
    try {
      await mongoose.connection.close(false);
      console.log('MongoDB connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error closing Mongoose connection:', err);
      process.exit(1);
    }
  });

  // Force exit if graceful shutdown hangs
  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing process exit...');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


