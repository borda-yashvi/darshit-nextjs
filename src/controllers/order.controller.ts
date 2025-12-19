import { Request, Response } from "express";
import { OrderService } from "../services/order.service";

export class OrderController {
    static async create(req: Request & { user?: any }, res: Response) {
        try {
            const userId = req.user.id;
            const { amount, meta } = req.body;
            if (!amount) return res.status(400).json({ message: "Amount required" });

            const order = await OrderService.createOrder({ user: userId, amount, meta });
            res.json({ order });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async list(req: Request & { user?: any }, res: Response) {
        try {
            const userId = req.user.id;
            const orders = await OrderService.getOrdersByUser(userId);
            res.json({ orders });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }
}
