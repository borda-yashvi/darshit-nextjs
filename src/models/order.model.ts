import { Schema, model } from "mongoose";

const orderSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        amount: { type: Number, required: true },
        status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
        paymentDate: { type: Date },
        meta: { type: Object }
    },
    { timestamps: true }
);

const OrderModel = model("Order", orderSchema);
export default OrderModel;
