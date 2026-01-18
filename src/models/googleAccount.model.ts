import { Schema, model, Types } from "mongoose";

const googleAccountsSchema = new Schema(
    {
        userId: {
            type: Types.ObjectId,
            ref: "User",
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        name: {
            type: String,
            trim: true,
        },
        picture: {
            type: String,
            trim: true,
        },
        sub: {
            type: String,
            required: true,
        },
        action: {
            type: String,
            enum: ["login", "signup", "link", "unlink"],
            default: "login",
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
        status: {
            type: String,
            enum: ["success", "failed"],
            default: "success",
        },
        errorMessage: {
            type: String,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true }
);

// Create index for faster queries
googleAccountsSchema.index({ email: 1, timestamp: -1 });
googleAccountsSchema.index({ sub: 1 });
googleAccountsSchema.index({ userId: 1 });

export default model("GoogleAccount", googleAccountsSchema);
