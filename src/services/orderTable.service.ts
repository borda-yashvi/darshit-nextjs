import OrderTableModel from "../models/orderTable.model";

export const OrderTableService = {
    async createRow(payload: any) {
        const created = await OrderTableModel.create(payload);
        return created.toObject();
    },

    async createRows(payloads: any[]) {
        // ensure payloads each have order reference
        const created = await OrderTableModel.insertMany(payloads);
        return created.map((c: any) => c.toObject());
    },

    async updateRow(id: string, payload: any) {
        return OrderTableModel.findByIdAndUpdate(id, payload, { new: true }).lean();
    },

    async deleteRow(id: string) {
        return OrderTableModel.findByIdAndDelete(id).lean();
    },

    async deleteRows(ids: string[]) {
        return OrderTableModel.deleteMany({
            _id: { $in: ids },
        });
    },

    async getRowsByOrder(orderId: string, page?: number, limit?: number) {
        const query: any = { order: orderId };
        const total = await OrderTableModel.countDocuments(query);
        let q = OrderTableModel.find(query).sort({ orderIndex: 1, createdAt: 1 });
        if (page !== undefined && limit !== undefined && Number(limit) > 0) {
            const p = Number(page) || 1;
            const l = Number(limit) || 10;
            q = q.skip((p - 1) * l).limit(l);
        }
        const rows = await q.lean();
        return { rows, total };
    }
};

// helper to delete all rows for an order
export async function deleteRowsByOrder(orderId: string) {
    return OrderTableModel.deleteMany({ order: orderId });
}

export async function reorderRowsByIds(orderId: string, ids: string[]) {
    if (!Array.isArray(ids)) throw new Error("ids must be an array");
    const ops = ids.map((id, idx) => ({
        updateOne: {
            filter: { _id: id, order: orderId },
            update: { $set: { orderIndex: idx } }
        }
    }));
    if (ops.length === 0) return { ok: 1 };
    return OrderTableModel.bulkWrite(ops as any);
}

export async function bulkUpdateRows(items: any[]) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const ops = items.map((it) => {
        const { _id, ...rest } = it;
        return {
            updateOne: {
                filter: { _id },
                update: { $set: rest }
            }
        };
    });
    await OrderTableModel.bulkWrite(ops as any);
    const ids = items.map((i) => i._id) as any[];
    return OrderTableModel.find({ _id: { $in: ids as any } }).lean();
}
