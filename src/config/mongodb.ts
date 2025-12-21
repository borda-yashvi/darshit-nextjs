import mongoose from "mongoose";
import { env } from "./env";

const uri = env.mongoUri;

let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(uri, {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
        });
    }

    cached.conn = await cached.promise;
    return cached.conn;
}
