import app from "./app";
import { env } from "./config/env";
import connectDB from "./config/mongodb";

const PORT = process.env.PORT || 5000;

const start = async () => {
    try {
        await connectDB();
        if (process.env.NODE_ENV !== "production") {
            app.listen(5000, () => {
                console.log("Local server running on port 5000");
            });
        }
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

start();
