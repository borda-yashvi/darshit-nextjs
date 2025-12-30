import dotenv from "dotenv";
dotenv.config();

export const env = {
  jwtSecret: process.env.JWT_SECRET || "default_secret",
  mongoUri: process.env.MONGO_URI,
  emailHost: process.env.EMAIL_HOST || "smtp.gmail.com",
  emailPort: parseInt(process.env.EMAIL_PORT || "587"),
  emailUser: process.env.EMAIL_USER || "",
  emailPass: process.env.EMAIL_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "noreply@example.com",
  // SMS Configuration
  smsService: process.env.SMS_SERVICE || "console", // console, twilio, aws
  smsApiKey: process.env.SMS_API_KEY || "",
  smsApiSecret: process.env.SMS_API_SECRET || "",
  smsFromNumber: process.env.SMS_FROM_NUMBER || ""
};
