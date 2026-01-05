import { Schema, model } from "mongoose";

const otpSchema = new Schema(
    {
        phone: { type: String, required: true, index: true },
        countryCode: { type: String, required: true, index: true },
        otp: { type: String, required: true },
        expiry: { type: Date, required: true, index: true },
        sentAt: { type: Date, default: Date.now },
        // rate-limiting
        sendCount: { type: Number, default: 0 },
        windowStart: { type: Date },
        // purpose: 'signup' | 'login'
        purpose: { type: String, enum: ['signup', 'login'], default: 'login' },
        // if signup flow, store pending fullName and device metadata here
        pendingFullName: { type: String },
        status: { type: String, enum: ['pending', 'used', 'expired'], default: 'pending' },
        deviceMeta: {
            deviceId: { type: String },
            type: { type: String },
            platform: { type: String },
            companyBrand: { type: String },
            companyDevice: { type: String },
            companyModel: { type: String },
            appVersion: { type: String },
            userAgent: { type: String },
            ip: { type: String },
            name: { type: String }
        }
    },
    { timestamps: true }
);

// TTL index: ensure documents are removed some time after expiry (optional fallback)
otpSchema.index({ expiry: 1 }, { expireAfterSeconds: 60 * 60 * 24 }); // 24 hours after expiry as safety

const OtpModel = model("Otp", otpSchema);
export default OtpModel;
