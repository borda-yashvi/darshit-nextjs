import app from "./app";
import { env } from "./config/env";
import connectDB from "./config/mongodb";

const PORT = process.env.PORT || 5000;

const start = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

start();
