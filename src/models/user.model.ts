import { Schema, model } from "mongoose";

const userSchema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String },
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
        phone: { type: String, index: true, unique: true },
        countryCode: { type: String },
        fullName: { type: String },
        dob: { type: Date },
        image: { type: String },
        loginOtp: { type: String },
        loginOtpExpiry: { type: Date },
        // OTP send rate-limiting fields
        loginOtpSentAt: { type: Date },
        loginOtpSendCount: { type: Number, default: 0 },
        loginOtpWindowStart: { type: Date },
        deleted_at: { type: Date, default: null, index: true }
    },
    { timestamps: true }
);

userSchema.virtual("userDevices", {
    ref: "UserDevice",
    localField: "_id",
    foreignField: "userId",
});

const UserModel = model("User", userSchema);
export default UserModel;
