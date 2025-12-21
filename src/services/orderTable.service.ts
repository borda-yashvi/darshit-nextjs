import OrderTableModel from "../models/orderTable.model";

export const OrderTableService = {
    async createRow(payload: any) {
        const created = await OrderTableModel.create(payload);
        return created.toObject();
    },

    async updateRow(id: string, payload: any) {
        return OrderTableModel.findByIdAndUpdate(id, payload, { new: true }).lean();
    },

    async deleteRow(id: string) {
        return OrderTableModel.findByIdAndDelete(id).lean();
    },

    async getRowsByOrder(orderId: string) {
        return OrderTableModel.find({ order: orderId }).lean();
    }
};

// helper to delete all rows for an order
export async function deleteRowsByOrder(orderId: string) {
    return OrderTableModel.deleteMany({ order: orderId });
}
