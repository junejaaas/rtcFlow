import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    } catch (error) {
        console.error("❌ MongoDB Connection Error:");
        console.error(error); // Print full error object
        process.exit(1); // Stop server if DB isn't connected
    }
};

export default connectDB;