import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://mypersonalblog255:3226325537@mypersonalblog.jiu416h.mongodb.net/blogplatform';

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};