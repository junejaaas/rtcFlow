import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000, // fail fast with a clear error
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB connection failed: ${error.message}`);
        console.error("Check: 1) Your IP is whitelisted in Atlas  2) MONGO_URI in .env is correct  3) Internet is reachable");
        // Do NOT exit — keep server alive so the error is visible
    }
};

export default connectDB;