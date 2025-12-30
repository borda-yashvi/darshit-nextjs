import express from "express";
import userRoutes from "./routes/user.route";
import orderRoutes from "./routes/order.route";
import partyRoutes from "./routes/party.route";
import { connectDB } from "./config/mongodb";

const app = express();
app.use(express.json());

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
app.use("/api/parties", partyRoutes);

export default app;
