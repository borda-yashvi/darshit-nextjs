import dotenv from "dotenv";
dotenv.config();

export const env = {
  jwtSecret: process.env.JWT_SECRET || "default_secret",
  mongoUri: process.env.MONGO_URI || "mongodb+srv://yashasvi:zt8Cjd1cXw53X05L@saree-order.lwrdxtx.mongodb.net/s"
};
