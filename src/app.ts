import express from "express";
import userRoutes from "./routes/user.route";
import orderRoutes from "./routes/order.route";
import { connectDB } from "./config/mongodb";

const app = express();
app.use(express.json());
// Establish a global DB connection on startup. connectDB is idempotent
// and uses a global cache so calling it here works for both local
// server (server.ts) and serverless imports (api/index.ts).
connectDB().catch((err) => console.error("Global DB connection failed:", err));
app.get("/api", (req, res) => {
  res.send("Hello from Vercel 🚀");
});

app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);

export default app;
