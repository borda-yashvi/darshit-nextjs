import express from "express";
import userRoutes from "./routes/user.route";
import orderRoutes from "./routes/order.route";

const app = express();
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);

export default app;
