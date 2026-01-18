import { Schema, model } from "mongoose";

const googleTokenSchema = new Schema(
    {
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
            unique: true,
        },
        data: {
            type: Schema.Types.Mixed,
        },
        verifiedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

export default model("GoogleToken", googleTokenSchema);
