import { Request, Response } from "express";
import { OrderService } from "../services/order.service";
import { OrderTableService, deleteRowsByOrder, bulkUpdateRows } from "../services/orderTable.service";
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
                qty,
                totalMtrRepit: totalMtrRepit ? totalMtrRepit : undefined,
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
                    // normalize numeric/string fields
                    payloads.forEach((p: any) => {
                        if (p.repit !== undefined) p.repit = Number(p.repit);
                        if (p.total !== undefined) p.total = Number(p.total);
                        if (p.qty !== undefined) p.qty = String(p.qty);
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
            return successResponse(res, { orders, total, page: page || 1, limit: limit || orders.length, totalPages: Math.ceil(total / (limit || orders.length || total)) });
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
                    $set: { "views.lastViewedAt": new Date().toISOString() }
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
            if (payload.totalMtrRepit) payload.totalMtrRepit = payload.totalMtrRepit;
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

            // convert numeric fields if present
            if (payload.totalMtrRepit) payload.totalMtrRepit = payload.totalMtrRepit;
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
                // partition rows based on flags
                const rows = rowsRaw as any[];

                // rows marked for deletion (must have _id)
                const toDeleteIds = rows.filter((r: any) => r.isDeleted && (r._id || r.id)).map((r: any) => r._id || r.id);

                // rows marked as added
                const toCreate = rows.filter((r: any) => r.isAdded).map((r: any, idx: number) => {
                    const item: any = { order: orderId, orderIndex: r.orderIndex ?? idx, ...r };
                    // remove client side helper fields
                    delete item._id || item.id;
                    delete item.isAdded;
                    delete item.isDeleted;
                    return item;
                });

                // rows to update (existing rows without isDeleted/isAdded)
                const toUpdate = rows.filter((r: any) => !r.isAdded && !r.isDeleted && r._id).map((r: any) => ({
                    _id: r._id,
                    // orderIndex: r.orderIndex,
                    f1: r.f1,
                    f2: r.f2,
                    f3: r.f3,
                    f4: r.f4,
                    f5: r.f5,
                    f6: r.f6,
                    qty: r.qty !== undefined ? String(r.qty) : r.qty,
                    repit: r.repit !== undefined ? Number(r.repit) : r.repit,
                    total: r.total !== undefined ? Number(r.total) : r.total
                }));

                // perform deletions first
                if (toDeleteIds.length) {
                    OrderTableService.deleteRows(toDeleteIds);
                }

                // create new rows
                if (toCreate.length) {
                    // normalize numeric/string fields
                    toCreate.forEach((p: any) => {
                        if (p.repit !== undefined) p.repit = Number(p.repit);
                        if (p.total !== undefined) p.total = Number(p.total);
                        if (p.qty !== undefined) p.qty = String(p.qty);
                    });
                    createdRows = await OrderTableService.createRows(toCreate);
                }

                // update remaining rows
                if (toUpdate.length) {
                    updatedRows = await bulkUpdateRows(toUpdate);
                }

                (req as any)._deletedRows = toDeleteIds;
            }

            return successResponse(res, { order: updatedOrder, createdRows, updatedRows, deletedRows: (req as any)._deletedRows });
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
                const payloads = body.map((b: any, idx: number) => {
                    const p: any = { order: orderId, orderIndex: b.orderIndex ?? idx, ...b };
                    if (p.qty !== undefined) p.qty = String(p.qty);
                    return p;
                });
                const rows = await OrderTableService.createRows(payloads);
                return successResponse(res, { rows });
            }
            const payload: any = { order: orderId, ...body };
            if (payload.qty !== undefined) payload.qty = String(payload.qty);
            const row = await OrderTableService.createRow(payload);
            return successResponse(res, { row });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    // reorder / duplicate rows or duplicate entire order
    // - If request body contains an array of row ids -> duplicate those rows into the same order
    // - If no body array is provided -> duplicate the entire order (create a new order + copy all its rows)
    async reorderRows(req: Request & { user?: any }, res: Response) {
        try {
            const partyId = req.params.id;
            const anyReq: any = req;
            const body = anyReq.body;

            if (!Array.isArray(body) || !body.length) {
                return errorResponse(res, 400, "Expected an array of order ids in request body");
            }

            // Duplicate each order from the body into the provided party id
            const result = await OrderService.reorderRowsByIds(req.user.id, partyId, body as string[]);
            return successResponse(res, { duplicated: result.duplicated });
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
                quality: order.qty, // Add quality field to order model if needed
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
