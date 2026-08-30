import mongoose from 'mongoose';
import { sendEmail, sendChatNotification } from './utils/notifications';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const runTest = async () => {
  console.log('--- STARTING NOTIFICATIONS DIAGNOSTIC ---');
  console.log('MongoDB URI:', process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrms');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrms');
    console.log('MongoDB connected successfully!');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
  }

  console.log('\n--- 1. Testing Chat Notification (Simulated/Live) ---');
  try {
    const chatResult = await sendChatNotification({
      title: '🔌 Diagnostic Test Alert',
      description: 'Verifying notification pipeline from backend runner.',
      fields: [{ name: 'Status', value: 'Active', inline: true }]
    });
    console.log('Chat Notification Trigger Result:', chatResult);
  } catch (err) {
    console.error('Chat/Webhook failed:', err);
  }

  console.log('\n--- 2. Testing Email Dispatch (Simulated/Live) ---');
  try {
    const emailResult = await sendEmail({
      to: 'diagnostic_test@company.com',
      subject: '🔌 Diagnostic Test Email',
      html: '<h3>Diagnostic Test</h3><p>SMTP notification pipeline verification.</p>'
    });
    console.log('Email Trigger Result:', emailResult);
  } catch (err) {
    console.error('Email failed:', err);
  }

  await mongoose.disconnect();
  console.log('\n--- DIAGNOSTIC FINISHED ---');
  process.exit(0);
};

runTest();
