import PartyModel from "../models/party.model";

export const PartyService = {
    async createParty(payload: any) {
        const created = await PartyModel.create(payload);
        return created.toObject();
    },

    async getPartiesByUser(userId: string, search?: string, page?: number, limit?: number, sort?: string) {
        const baseQuery: any = { user: userId };

        // Search on partyName, mobile, gstNo
        if (search && typeof search === "string" && search.trim().length) {
            const re = new RegExp(search.trim(), "i");
            baseQuery.$or = [
                { partyName: re },
                { mobile: re },
                { gstNo: re }
            ];
        }

        const total = await PartyModel.countDocuments(baseQuery);

        // Build query with sorting
        const sortField = sort || "createdAt";
        const sortOrder = sortField.startsWith("-") ? -1 : 1;
        const sortKey = sortField.replace(/^-/, "");

        let q = PartyModel.find(baseQuery).sort({ [sortKey]: sortOrder });

        // Apply pagination only if page and limit are provided
        if (page !== undefined && limit !== undefined && Number(limit) > 0) {
            const p = Number(page) || 1;
            const l = Number(limit) || 10;
            q = q.skip((p - 1) * l).limit(l);
        }

        const parties = await q.lean();
        return { parties, total };
    },

    async getPartyById(partyId: string) {
        return PartyModel.findById(partyId).lean();
    },

    async updateParty(partyId: string, payload: any) {
        return PartyModel.findByIdAndUpdate(partyId, payload, { new: true }).lean();
    },

    async deleteParty(partyId: string) {
        return PartyModel.findByIdAndDelete(partyId).lean();
    }
};
