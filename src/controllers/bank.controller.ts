import { Request, Response } from "express";
import { BankService } from "../services/bank.service";
import { successResponse, errorResponse } from "../utils/response.util";

export const BankController = {
  async createBank(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { bankName, accountHolderName, accountNumber, ifscCode, branchName } =
        req.body;

      const bank = await BankService.createBank(userId, {
        bankName,
        accountHolderName,
        accountNumber,
        ifscCode,
        branchName,
      });

      return successResponse(res, {
        message: "Bank account created successfully",
        bank,
      }, 201);
    } catch (error: any) {
      return errorResponse(res, 400, error.message || "Failed to create bank account");
    }
  },

  async getBankById(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const id = String(req.params.id);

      const bank = await BankService.getBankById(id, userId);

      return successResponse(res, {
        message: "Bank account retrieved successfully",
        bank,
      });
    } catch (error: any) {
      return errorResponse(res, 404, error.message || "Failed to retrieve bank account");
    }
  },

  async getBanksByUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { search = "", page, limit, active } = req.query;

      const result = await BankService.getBanksByUser(
        userId,
        String(search),
        page ? Number(page) : undefined,
        limit ? Number(limit) : undefined,
        active !== undefined ? active === "true" : undefined
      );

      return successResponse(res, {
        message: "Bank accounts retrieved successfully",
        ...result,
      });
    } catch (error: any) {
      return errorResponse(res, 400, error.message || "Failed to retrieve bank accounts");
    }
  },

  async updateBank(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const id = String(req.params.id);
      const { bankName, accountHolderName, accountNumber, ifscCode, branchName, isActive } =
        req.body;

      const bank = await BankService.updateBank(id, userId, {
        ...(bankName && { bankName }),
        ...(accountHolderName && { accountHolderName }),
        ...(accountNumber && { accountNumber }),
        ...(ifscCode && { ifscCode }),
        ...(branchName && { branchName }),
        ...(isActive !== undefined && { isActive }),
      });

      return successResponse(res, {
        message: "Bank account updated successfully",
        bank,
      });
    } catch (error: any) {
      return errorResponse(res, 400, error.message || "Failed to update bank account");
    }
  },

  async deleteBank(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const id = String(req.params.id);

      await BankService.deleteBank(id, userId);

      return successResponse(res, {
        message: "Bank account deleted successfully",
      });
    } catch (error: any) {
      return errorResponse(res, 400, error.message || "Failed to delete bank account");
    }
  },
};
