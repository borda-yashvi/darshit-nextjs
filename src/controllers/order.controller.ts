import { Request, Response } from "express";
import { OrderService } from "../services/order.service";
import { OrderTableService, deleteRowsByOrder } from "../services/orderTable.service";
import { uploadImage, deleteImage } from "../config/cloudinary";
import { generateSareePdf } from "../pdf/sareePDF";

export const OrderController = {
    async create(req: Request & { user?: any }, res: Response) {
        try {
            const userId = req.user.id;
            // All fields must come from multipart/form-data (req.body) and file via req.file
            const anyReq: any = req;
            const file = anyReq.file;
            const {
                orderNo,
                date,
                machineNo,
                saller,
                designNo,
                pick,
                qty,
                totalMtrRepit,
                totalColor
            } = req.body;

            if (!orderNo || !date) return res.status(400).json({ message: "orderNo and date required" });

            let imageUrl: string | undefined;
            if (file && file.buffer) {
                const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
                const uploaded = await uploadImage(dataUri, { folder: `orders/${userId}` });
                imageUrl = uploaded.secure_url || uploaded.url;
                var imagePublicId = uploaded.public_id;
            }

            const order = await OrderService.createOrder({
                user: userId,
                orderNo,
                date: new Date(date),
                machineNo,
                saller,
                designNo,
                pick,
                qty: qty ? Number(qty) : undefined,
                totalMtrRepit: totalMtrRepit ? Number(totalMtrRepit) : undefined,
                totalColor: totalColor ? Number(totalColor) : undefined,
                imageUrl,
                imagePublicId
            });

            res.json({ order });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    },

    async list(req: Request & { user?: any }, res: Response) {
        try {
            const userId = req.user.id;
            const orders = await OrderService.getOrdersByUser(userId);
            res.json({ orders });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    },

    async get(req: Request & { user?: any }, res: Response) {
        try {
            const orderId = req.params.id;
            const data = await OrderService.getOrderDetail(orderId);
            if (!data) return res.status(404).json({ message: "Order not found" });
            // increment view count
            try {
                await OrderService.updateOrder(orderId, {
                    $inc: { "views.count": 1 },
                    $set: { "views.lastViewedAt": new Date() }
                } as any);
            } catch (e) {
                // ignore view increment failures
            }
            res.json(data);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    },

    async update(req: Request & { user?: any }, res: Response) {
        try {
            const orderId = req.params.id;
            const payload: any = { ...req.body };
            const anyReq: any = req;
            const file = anyReq.file;
            if (file && file.buffer) {
                const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
                const uploaded = await uploadImage(dataUri, { folder: `orders/${req.user.id}` });
                payload.imageUrl = uploaded.secure_url || uploaded.url;
                payload.imagePublicId = uploaded.public_id;
            }
            // convert numeric fields if present
            if (payload.qty) payload.qty = Number(payload.qty);
            if (payload.totalMtrRepit) payload.totalMtrRepit = Number(payload.totalMtrRepit);
            if (payload.totalColor) payload.totalColor = Number(payload.totalColor);
            const updated = await OrderService.updateOrder(orderId, payload);
            if (!updated) return res.status(404).json({ message: "Order not found" });
            res.json({ order: updated });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    },

    // order-table row handlers
    async addRow(req: Request & { user?: any }, res: Response) {
        try {
            const orderId = req.params.id;
            const payload = { order: orderId, ...req.body };
            const row = await OrderTableService.createRow(payload);
            res.json({ row });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    },

    async updateRow(req: Request & { user?: any }, res: Response) {
        try {
            const rowId = req.params.rowId;
            const updated = await OrderTableService.updateRow(rowId, req.body);
            if (!updated) return res.status(404).json({ message: "Row not found" });
            res.json({ row: updated });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    },

    async deleteRow(req: Request & { user?: any }, res: Response) {
        try {
            const rowId = req.params.rowId;
            const deleted = await OrderTableService.deleteRow(rowId);
            if (!deleted) return res.status(404).json({ message: "Row not found" });
            res.json({ deleted });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    },

    async delete(req: Request & { user?: any }, res: Response) {
        try {
            const orderId = req.params.id;
            // remove all order-table rows first
            await deleteRowsByOrder(orderId);
            const deleted = await OrderService.deleteOrder(orderId);
            if (!deleted) return res.status(404).json({ message: "Order not found" });
            // delete uploaded image from Cloudinary if present
            try {
                if ((deleted as any).imagePublicId) {
                    await deleteImage((deleted as any).imagePublicId);
                }
            } catch (e) {
                console.error("Failed to delete image from Cloudinary:", e);
            }
            res.json({ deleted });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    },

    async getSareePdf(req: Request & { user?: any }, res: Response) {
        try {
            const pdfBuffer = await generateSareePdf({
                orderNo: "1838",
                date: "09-11-2023",
                machineNo: "L-",
                saler: "DARSHIT",
                designNo: "VR-51",
                pick: "38-40",
                quality: "KOTA",
                totalMeter: "40",
                totalColor: "8",
                totalSarees: 120,
                designImage: "https://your-image-url.com/design.jpg",

                rows: [
                    { f1: "N-GAJARI", f2: "210 CHIKU", f3: "D.GREEN", f4: "N-GAJARI", f5: "WINE", repeat: 5, total: 15 },
                    { f1: "BLACK", f2: "210 CHIKU", f3: "D.GREEN", f4: "N-GAJARI", f5: "WINE", repeat: 5, total: 15 },
                    { f1: "B.GREEN", f2: "210 CHIKU", f3: "D.GREEN", f4: "N-GAJARI", f5: "WINE", repeat: 5, total: 15 },
                ],
            });

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", "inline; filename=saree.pdf");
            res.send(pdfBuffer);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }
};
