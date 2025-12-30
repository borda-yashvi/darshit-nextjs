import { Request, Response } from "express";
import { PartyService } from "../services/party.service";
import { successResponse, errorResponse } from "../utils/response.util";

export const PartyController = {
    async create(req: Request & { user?: any }, res: Response) {
        try {
            const userId = req.user.id;
            const { partyName, mobile, gstNo, address } = req.body;

            if (!partyName) {
                return errorResponse(res, 400, "partyName is required");
            }

            const party = await PartyService.createParty({
                user: userId,
                partyName,
                mobile,
                gstNo,
                address,
            });

            return successResponse(res, { party });
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
            const sort = anyReq.query && anyReq.query.sort ? String(anyReq.query.sort) : undefined;

            const { parties, total } = await PartyService.getPartiesByUser(userId, search, page, limit, sort);

            // Return with pagination info only if page/limit were provided
            if (page !== undefined && limit !== undefined) {
                return successResponse(res, {
                    parties,
                    total,
                    page: page || 1,
                    limit: limit || parties.length
                });
            }

            return successResponse(res, { parties, total });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    async get(req: Request & { user?: any }, res: Response) {
        try {
            const partyId = req.params.id;
            const party = await PartyService.getPartyById(partyId);

            if (!party) {
                return errorResponse(res, 404, "Party not found");
            }

            return successResponse(res, { party });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    async update(req: Request & { user?: any }, res: Response) {
        try {
            const partyId = req.params.id;
            const { partyName, mobile, gstNo, address } = req.body;

            const payload: any = {};
            if (partyName !== undefined) payload.partyName = partyName;
            if (mobile !== undefined) payload.mobile = mobile;
            if (gstNo !== undefined) payload.gstNo = gstNo;
            if (address !== undefined) payload.address = address;

            const updated = await PartyService.updateParty(partyId, payload);

            if (!updated) {
                return errorResponse(res, 404, "Party not found");
            }

            return successResponse(res, { party: updated });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    },

    async delete(req: Request & { user?: any }, res: Response) {
        try {
            const partyId = req.params.id;
            const deleted = await PartyService.deleteParty(partyId);

            if (!deleted) {
                return errorResponse(res, 404, "Party not found");
            }

            return successResponse(res, { deleted });
        } catch (err: any) {
            return errorResponse(res, 500, "Internal Server Error", { error: err.message });
        }
    }
};
