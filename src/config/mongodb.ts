import mongoose from "mongoose";
import { env } from "./env";

const connectDB = async () => {
    try {
        const uri = env.mongoUri;
        await mongoose.connect(uri, {
            // useUnifiedTopology and useNewUrlParser are default in mongoose v7+
        } as mongoose.ConnectOptions);
        console.log("✅ MongoDB connected");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        throw error;
    }
};

export default connectDB;
export { mongoose };
