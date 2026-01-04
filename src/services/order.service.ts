import OrderModel from "../models/order.model";
import OrderTableModel from "../models/orderTable.model";
import mongoose from "mongoose";

export const OrderService = {
    async createOrder(payload: any) {
        const created = await OrderModel.create(payload);
        return created.toObject();
    },

    async getOrdersByUser(userId: string, search?: string, page?: number, limit?: number, partyId?: string) {
        const baseQuery: any = { user: userId };

        // Filter by party if provided
        if (partyId) {
            baseQuery.party = partyId;
        }

        if (search && typeof search === "string" && search.trim().length) {
            const re = new RegExp(search.trim(), "i");
            baseQuery.$or = [
                { orderNo: re },
                { designNo: re },
                { saller: re }
            ];
        }
        const total = await OrderModel.countDocuments(baseQuery);
        let q = OrderModel.find(baseQuery).sort({ createdAt: -1 }).populate("party", "_id partyName mobile").populate("orderTables")
        if (page !== undefined && limit !== undefined && Number(limit) > 0) {
            const p = Number(page) || 1;
            const l = Number(limit) || 10;
            q = q.skip((p - 1) * l).limit(l);
        }
        const orders = await q.lean();
        return { orders, total };
    },

    async getOrderWithRows(orderId: string) {
        const order = await OrderModel.findById(orderId).lean();
        if (!order) return null;
        const rows = await OrderTableModel.find({ order: orderId }).sort({ orderIndex: 1, createdAt: 1 }).lean();
        return { order, rows };
    },

    async getOrderDetail(orderId: string, page?: number, limit?: number) {
        const order = await OrderModel.findById(orderId).populate("party", "_id partyName mobile").lean();
        if (!order) return null;

        const match = { order: new mongoose.Types.ObjectId(orderId) } as any;

        // compute aggregates and total count using aggregation
        const agg = await OrderTableModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalRepit: { $sum: { $ifNull: ["$repit", 0] } },
                    total: { $sum: { $ifNull: ["$total", 0] } },
                    count: { $sum: 1 }
                }
            }
        ]);

        const aggregates = agg && agg[0] ? { totalRepit: agg[0].totalRepit, total: agg[0].total } : { totalRepit: 0, total: 0 };
        const total = agg && agg[0] ? agg[0].count : 0;

        // fetch paginated rows
        let q = OrderTableModel.find({ order: orderId }).sort({ orderIndex: 1, createdAt: 1 });
        if (page !== undefined && limit !== undefined && Number(limit) > 0) {
            const p = Number(page) || 1;
            const l = Number(limit) || 10;
            q = q.skip((p - 1) * l).limit(l);
        }
        const rows = await q.lean();

        // build a compact order view with requested fields
        const orderView = {
            id: order._id,
            orderNo: order.orderNo,
            date: order.date,
            machineNo: order.machineNo,
            saller: order.saller,
            designNo: order.designNo,
            pick: order.pick,
            qty: order.qty,
            totalMtrRepit: order.totalMtrRepit,
            totalColor: order.totalColor,
            imageUrl: order.imageUrl,
            views: order.views,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        };

        return {
            order: orderView,
            rows,
            aggregates,
            total,
            page: page || 1,
            limit: limit || rows.length,
            totalPages: Math.ceil(total / (limit || total))
        };
    },

    async updateOrder(orderId: string, payload: any) {
        return OrderModel.findByIdAndUpdate(orderId, payload, { new: true }).lean();
    }
    ,
    async deleteOrder(orderId: string) {
        return OrderModel.findByIdAndDelete(orderId).lean();
    }
};
