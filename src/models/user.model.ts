import { Schema, model } from "mongoose";

const userSchema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, unique: true },
        password: { type: String },
        mobile: { type: String },
        devices: [
            {
                deviceId: { type: String, required: true, index: true },
                type: { type: String },
                category: { type: String, enum: ["mobile", "laptop", "other"], default: "mobile" },
                platform: { type: String },
                userAgent: { type: String },
                ip: { type: String },
                name: { type: String },
                lastSeen: { type: Date, default: Date.now },
                createdAt: { type: Date, default: Date.now }
            }
        ],
        profile: {
            bio: { type: String },
            address: { type: String },
            avatarUrl: { type: String }
        },
        isActive: { type: Boolean, default: true },
        payment: {
            type: { type: String, default: "free" },
            startDate: { type: Date, default: Date.now },
            durationDays: { type: Number, default: 30 },
            expiresAt: { type: Date }
        },
        resetOtp: { type: String },
        resetOtpExpiry: { type: Date },
        // Mobile OTP authentication fields
        phone: { type: String, index: true },
        countryCode: { type: String },
        fullName: { type: String },
        dob: { type: Date },
        image: { type: String },
        loginOtp: { type: String },
        loginOtpExpiry: { type: Date }
    },
    { timestamps: true }
);

const UserModel = model("User", userSchema);
export default UserModel;
