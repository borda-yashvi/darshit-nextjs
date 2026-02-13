import { Bank } from "../models/bank.model";

export const BankService = {
  async createBank(userId: string, payload: any) {
    try {
      const bank = await Bank.create({
        user: userId,
        ...payload,
      });

      return bank;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error("Account number already exists");
      }
      throw error;
    }
  },

  async getBankById(bankId: string, userId: string) {
    const bank = await Bank.findOne({
      _id: bankId,
      user: userId,
    });

    if (!bank) {
      throw new Error("Bank account not found");
    }

    return bank;
  },

  async getBanksByUser(
    userId: string,
    search: string = "",
    page?: number,
    limit?: number,
    active?: boolean
  ) {
    const query: any = { user: userId };

    // Add active filter only if it's explicitly passed
    if (active !== undefined) {
      query.isActive = active;
    }

    if (search) {
      query.$or = [
        { bankName: { $regex: search, $options: "i" } },
        { accountHolderName: { $regex: search, $options: "i" } },
        { branchName: { $regex: search, $options: "i" } },
        { accountNumber: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Bank.countDocuments(query);

    let query_result = Bank.find(query).sort({ createdAt: -1 });

    // Apply pagination only if page and limit are provided
    if (page && limit) {
      query_result = query_result.skip((page - 1) * limit).limit(limit);
      const banks = await query_result.lean();
      return {
        banks,
        total,
        page,
        limit,
      };
    }

    // If no pagination, return all records
    const banks = await query_result.lean();
    return {
      banks,
      total,
    };
  },

  async updateBank(bankId: string, userId: string, payload: any) {
    const bank = await Bank.findOneAndUpdate(
      { _id: bankId, user: userId },
      { ...payload, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!bank) {
      throw new Error("Bank account not found");
    }

    return bank;
  },

  async deleteBank(bankId: string, userId: string) {
    const bank = await Bank.findOneAndDelete({
      _id: bankId,
      user: userId,
    });

    if (!bank) {
      throw new Error("Bank account not found");
    }

    return bank;
  },
};
