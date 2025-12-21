import express from "express";
import userRoutes from "./routes/user.route";
import orderRoutes from "./routes/order.route";
import { connectDB } from "./config/mongodb";

const app = express();
app.use(express.json());
// Ensure DB connection is established before handling requests.
// For local dev, `server.ts` already awaits connectDB(); for serverless
// (Vercel) we add a lightweight middleware that awaits the cached
// `connectDB()` promise once per process. This avoids performing
// expensive reconnects on every request while ensuring mongoose is
// connected before any DB operation (bufferCommands=false).
let dbConnecting = false;
app.use(async (req, _res, next) => {
  try {
    if (!dbConnecting) {
      dbConnecting = true;
      await connectDB();
    } else {
      // ensure any inflight connect finishes
      await connectDB();
    }
    return next();
  } catch (err) {
    return next(err);
  }
});
app.get("/api", (req, res) => {
  res.send("Hello from Vercel 🚀");
});

app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);

export default app;
