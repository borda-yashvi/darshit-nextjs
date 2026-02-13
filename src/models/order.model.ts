import { Schema, model } from "mongoose";

const orderSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        orderNo: { type: Number, required: true },
        date: { type: Date, required: true },
        machineNo: { type: String },
        saller: { type: String },
        designNo: { type: String },
        pick: { type: Number },
        qty: { type: String },
        totalMtrRepit: { type: Number },
        totalColor: { type: Number },
        imageUrl: { type: String },
        imagePublicId: { type: String },
        party: { type: Schema.Types.ObjectId, ref: "Party" },
        // track basic view info
        views: {
            count: { type: Number, default: 0 },
            lastViewedAt: { type: Date }
        }
    },
    { timestamps: true }
);

orderSchema.virtual("orderTables", {
    ref: "OrderTable",
    localField: "_id",
    foreignField: "order",
});

const OrderModel = model("Order", orderSchema);
export default OrderModel;
