import OrderModel from "../models/order.model";

export const OrderService = {
    async createOrder(payload: any) {
        const created = await OrderModel.create(payload);
        return created.toObject();
    },

    async getOrdersByUser(userId: string) {
        return OrderModel.find({ user: userId }).lean();
    },
};
