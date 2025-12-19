import OrderModel from "../models/order.model";

export class OrderService {
    static async createOrder(payload: any) {
        const created = await OrderModel.create(payload);
        return created.toObject();
    }

    static async getOrdersByUser(userId: string) {
        return OrderModel.find({ user: userId }).lean();
    }
}
