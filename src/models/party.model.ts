import { Schema, model } from "mongoose";

const partySchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        partyName: { type: String, required: true },
        mobile: { type: String },
        gstNo: { type: String },
        address: { type: String },
    },
    { timestamps: true }
);

const PartyModel = model("Party", partySchema);
export default PartyModel;
