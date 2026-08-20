import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  const connUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrms';
  
  try {
    const conn = await mongoose.connect(connUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error}`);
    process.exit(1);
  }
};

// Connection event listeners
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection lost. Attempting reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error: ${err}`);
});

export default connectDB;
