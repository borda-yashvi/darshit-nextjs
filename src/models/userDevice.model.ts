import { Schema, model, Types } from "mongoose";

const userDeviceSchema = new Schema(
    {
        userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
        deviceId: { type: String, required: true, index: true },
        type: { type: String },
        category: { type: String, enum: ["mobile", "laptop", "other"], default: "mobile" },
        platform: { type: String },
        // optional vendor/device metadata
        companyBrand: { type: String },
        companyDevice: { type: String },
        companyModel: { type: String },
        appVersion: { type: String },
        ip: { type: String },
        name: { type: String },
        lastSeen: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

userDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

const UserDeviceModel = model("UserDevice", userDeviceSchema);
export default UserDeviceModel;
