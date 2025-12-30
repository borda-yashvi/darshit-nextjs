import { Request, Response } from "express";
import { OrderService } from "../services/order.service";
import { OrderTableService, deleteRowsByOrder, reorderRowsByIds, bulkUpdateRows } from "../services/orderTable.service";
import { uploadImage, deleteImage } from "../config/cloudinary";
import { generateSareePdf } from "../pdf/sareePdf";
import { successResponse, errorResponse } from "../utils/response.util";
import OrderModel from "../models/order.model";

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
                totalColor,
                party
            } = anyReq.body;

            if (!orderNo || !date) return errorResponse(res, 400, "orderNo and date required");

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
                imagePublicId,
                party: party || undefined
            });

            // if client provided rows in the request, create them and attach to order
            let createdRows: any[] | undefined;
            try {
                let rowsRaw: any = (anyReq.body && anyReq.body.rows) || (req.body && (req.body as any).rows);
                if (rowsRaw && typeof rowsRaw === "string") {
                    try {
                        rowsRaw = JSON.parse(rowsRaw);
                    } catch (e) {
                        rowsRaw = undefined;
                    }
                }

                if (Array.isArray(rowsRaw) && rowsRaw.length) {
                    const payloads = rowsRaw.map((r: any, idx: number) => ({
                        order: order._id,
                        orderIndex: r.orderIndex ?? idx,
                        ...r
                    }));
                    // normalize numeric fields
                    payloads.forEach((p: any) => {
                        if (p.repit !== undefined) p.repit = Number(p.repit);
                        if (p.total !== undefined) p.total = Number(p.total);
                    });
                    createdRows = await OrderTableService.createRows(payloads);
                }
            } catch (e) {
                // don't fail the whole order create if rows creation fails; log and continue
                console.error("Failed to create order rows:", e);
            }

            if (createdRows) return successResponse(res, { order, rows: createdRows });
            return successResponse(res, { order });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    async list(req: Request & { user?: any }, res: Response) {
        try {
            const userId = req.user.id;
            const anyReq: any = req;
            const search = anyReq.query && anyReq.query.search ? String(anyReq.query.search) : undefined;
            const page = anyReq.query && anyReq.query.page ? Number(anyReq.query.page) : undefined;
            const limit = anyReq.query && anyReq.query.limit ? Number(anyReq.query.limit) : undefined;
            const partyId = anyReq.query && anyReq.query.partyId ? String(anyReq.query.partyId) : undefined;

            const { orders, total } = await OrderService.getOrdersByUser(userId, search, page, limit, partyId);
            return successResponse(res, { orders, total, page: page || 1, limit: limit || orders.length });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    async get(req: Request & { user?: any }, res: Response) {
        try {
            const orderId = req.params.id;
            const anyReq: any = req;
            const page = anyReq.query && anyReq.query.page ? Number(anyReq.query.page) : undefined;
            const limit = anyReq.query && anyReq.query.limit ? Number(anyReq.query.limit) : undefined;
            const data = await OrderService.getOrderDetail(orderId, page, limit);
            if (!data) return errorResponse(res, 404, "Order not found");
            // increment view count
            try {
                await OrderService.updateOrder(orderId, {
                    $inc: { "views.count": 1 },
                    $set: { "views.lastViewedAt": new Date() }
                } as any);
            } catch (e) {
                // ignore view increment failures
            }
            return successResponse(res, data);
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    async update(req: Request & { user?: any }, res: Response) {
        try {
            const orderId = req.params.id;
            const anyReq: any = req;
            const payload: any = { ...anyReq.body };
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
            if (!updated) return errorResponse(res, 404, "Order not found");
            return successResponse(res, { order: updated });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    // update order and optionally create/update rows in a single request
    async updateWithRows(req: Request & { user?: any }, res: Response) {
        try {
            const orderId = req.params.id;
            const anyReq: any = req;
            const file = anyReq.file;
            const payload: any = { ...anyReq.body };

            if (file && file.buffer) {
                const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
                const uploaded = await uploadImage(dataUri, { folder: `orders/${req.user.id}` });
                payload.imageUrl = uploaded.secure_url || uploaded.url;
                payload.imagePublicId = uploaded.public_id;
            }

            // extract rows from payload if present
            let rowsRaw: any = payload.rows;
            delete payload.rows;

            // convert numeric fields if present
            if (payload.qty) payload.qty = Number(payload.qty);
            if (payload.totalMtrRepit) payload.totalMtrRepit = Number(payload.totalMtrRepit);
            if (payload.totalColor) payload.totalColor = Number(payload.totalColor);

            const updatedOrder = await OrderService.updateOrder(orderId, payload);
            if (!updatedOrder) return errorResponse(res, 404, "Order not found");

            let createdRows: any[] | undefined;
            let updatedRows: any[] | undefined;

            // if rowsRaw is a string (multipart) try parse
            if (rowsRaw && typeof rowsRaw === "string") {
                try {
                    rowsRaw = JSON.parse(rowsRaw);
                } catch (e) {
                    rowsRaw = undefined;
                }
            }

            if (Array.isArray(rowsRaw) && rowsRaw.length) {
                const toCreate = rowsRaw.filter((r: any) => !r._id).map((r: any, idx: number) => ({
                    order: orderId,
                    orderIndex: r.orderIndex ?? idx,
                    ...r
                }));

                const toUpdate = rowsRaw.filter((r: any) => r._id).map((r: any) => ({
                    _id: r._id,
                    orderIndex: r.orderIndex,
                    f1: r.f1,
                    f2: r.f2,
                    f3: r.f3,
                    f4: r.f4,
                    f5: r.f5,
                    f6: r.f6,
                    repit: r.repit !== undefined ? Number(r.repit) : r.repit,
                    total: r.total !== undefined ? Number(r.total) : r.total
                }));

                if (toCreate.length) {
                    // normalize numeric fields
                    toCreate.forEach((p: any) => {
                        if (p.repit !== undefined) p.repit = Number(p.repit);
                        if (p.total !== undefined) p.total = Number(p.total);
                    });
                    createdRows = await OrderTableService.createRows(toCreate);
                }

                if (toUpdate.length) {
                    updatedRows = await bulkUpdateRows(toUpdate);
                }
            }

            return successResponse(res, { order: updatedOrder, createdRows, updatedRows });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    // order-table row handlers
    async addRow(req: Request & { user?: any }, res: Response) {
        try {
            const orderId = req.params.id;
            const anyReq: any = req;
            const body: any = anyReq.body;
            // if client sends an array of rows create many
            if (Array.isArray(body)) {
                const payloads = body.map((b: any, idx: number) => ({ order: orderId, orderIndex: b.orderIndex ?? idx, ...b }));
                const rows = await OrderTableService.createRows(payloads);
                return successResponse(res, { rows });
            }
            const payload = { order: orderId, ...body };
            const row = await OrderTableService.createRow(payload);
            return successResponse(res, { row });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    // reorder rows within an order by receiving an array of row ids in desired order
    async reorderRows(req: Request & { user?: any }, res: Response) {
        try {
            const orderId = req.params.id;
            const ids: string[] = req.body;
            if (!Array.isArray(ids)) return errorResponse(res, 400, "Expected an array of row ids");
            const result = await reorderRowsByIds(orderId, ids);
            return successResponse(res, { result });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    async updateRow(req: Request & { user?: any }, res: Response) {
        try {
            const rowId = req.params.rowId;
            const updated = await OrderTableService.updateRow(rowId, req.body);
            if (!updated) return errorResponse(res, 404, "Row not found");
            return successResponse(res, { row: updated });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    async deleteRow(req: Request & { user?: any }, res: Response) {
        try {
            const rowId = req.params.rowId;
            const deleted = await OrderTableService.deleteRow(rowId);
            if (!deleted) return errorResponse(res, 404, "Row not found");
            return successResponse(res, { deleted });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    async delete(req: Request & { user?: any }, res: Response) {
        try {
            const orderId = req.params.id;
            // remove all order-table rows first
            await deleteRowsByOrder(orderId);
            const deleted = await OrderService.deleteOrder(orderId);
            if (!deleted) return errorResponse(res, 404, "Order not found");
            // delete uploaded image from Cloudinary if present
            try {
                if ((deleted as any).imagePublicId) {
                    await deleteImage((deleted as any).imagePublicId);
                }
            } catch (e) {
                console.error("Failed to delete image from Cloudinary:", e);
            }
            return successResponse(res, { deleted });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    async getSareePdf(req: Request & { user?: any }, res: Response) {
        try {
            const orderId = req.params.orderId;

            // Fetch order with rows
            const orderData = await OrderService.getOrderWithRows(orderId);
            if (!orderData) {
                return errorResponse(res, 404, "Order not found");
            }

            const { order, rows } = orderData;

            // Populate party information if exists
            let partyName = "Party"; // Default
            if (order.party) {
                const populatedOrder: any = await OrderModel.findById(orderId).populate("party", "partyName").lean();
                if (populatedOrder && populatedOrder.party) {
                    partyName = populatedOrder.party.partyName || partyName;
                }
            }

            // Format date
            const formattedDate = order.date
                ? new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '';

            // Calculate total sarees from rows
            const totalSarees = rows.reduce((sum: number, row: any) => sum + (row.total || 0), 0);

            // Map rows to PDF format
            const pdfRows = rows.map((row: any) => ({
                f1: row.f1 || '',
                f2: row.f2 || '',
                f3: row.f3 || '',
                f4: row.f4 || '',
                f5: row.f5 || '',
                f6: row.f6 || '',
                repeat: row.repit || 0,
                total: row.total || 0
            }));

            // Generate PDF with dynamic data
            const pdfBuffer = await generateSareePdf({
                partyName: partyName,
                orderNo: order.orderNo || '',
                date: formattedDate,
                machineNo: order.machineNo || '',
                saler: order.saller || '',
                designNo: order.designNo || '',
                pick: order.pick || '',
                quality: '', // Add quality field to order model if needed
                totalMeter: order.totalMtrRepit ? String(order.totalMtrRepit) : '',
                totalColor: order.totalColor ? String(order.totalColor) : '',
                totalSarees: totalSarees,
                designImage: order.imageUrl || '',
                rows: pdfRows,
            });

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename=order-${order.orderNo}.pdf`);
            res.setHeader("Content-Length", pdfBuffer.length);

            res.send(pdfBuffer);
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    }
};
