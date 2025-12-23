import { Schema, model } from "mongoose";

const orderTableSchema = new Schema(
    {
        order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
        orderIndex: { type: Number, default: 0 },
        f1: { type: String },
        f2: { type: String },
        f3: { type: String },
        f4: { type: String },
        f5: { type: String },
        f6: { type: String },
        repit: { type: Number },
        total: { type: Number }
    },
    { timestamps: true }
);

const OrderTableModel = model("OrderTable", orderTableSchema);
export default OrderTableModel;
