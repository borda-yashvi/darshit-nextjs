import OrderModel from "../models/order.model";
import OrderTableModel from "../models/orderTable.model";

export const OrderService = {
    async createOrder(payload: any) {
        const created = await OrderModel.create(payload);
        return created.toObject();
    },

    async getOrdersByUser(userId: string) {
        return OrderModel.find({ user: userId }).lean();
    },

    async getOrderWithRows(orderId: string) {
        const order = await OrderModel.findById(orderId).lean();
        if (!order) return null;
        const rows = await OrderTableModel.find({ order: orderId }).lean();
        return { order, rows };
    },

    async getOrderDetail(orderId: string) {
        const order = await OrderModel.findById(orderId).lean();
        if (!order) return null;
        const rows = await OrderTableModel.find({ order: orderId }).lean();

        // compute aggregates from rows
        const aggregates = rows.reduce(
            (acc: any, r: any) => {
                acc.totalRepit = acc.totalRepit + (Number(r.repit) || 0);
                acc.total = acc.total + (Number(r.total) || 0);
                return acc;
            },
            { totalRepit: 0, total: 0 }
        );

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
            aggregates
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
