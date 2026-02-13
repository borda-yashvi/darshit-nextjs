import { z } from "zod";

export const createBankSchema = z.object({
  bankName: z
    .string()
    .min(1, "Bank name is required")
    .min(2, "Bank name must be at least 2 characters")
    .max(100, "Bank name must be less than 100 characters"),
  accountHolderName: z
    .string()
    .min(1, "Account holder name is required")
    .min(2, "Account holder name must be at least 2 characters")
    .max(100, "Account holder name must be less than 100 characters"),
  accountNumber: z
    .string()
    .min(1, "Account number is required")
    .min(9, "Account number must be at least 9 digits")
    .max(18, "Account number must be less than 18 characters")
    .regex(/^[0-9]+$/, "Account number must contain only digits"),
  ifscCode: z
    .string()
    .min(1, "IFSC code is required")
    .length(11, "IFSC code must be exactly 11 characters")
    .regex(/^[A-Z0-9]{11}$/, "IFSC code must be 11 alphanumeric characters"),
  branchName: z
    .string()
    .min(1, "Branch name is required")
    .min(2, "Branch name must be at least 2 characters")
    .max(100, "Branch name must be less than 100 characters"),
});

export const updateBankSchema = z.object({
  bankName: z
    .string()
    .min(2, "Bank name must be at least 2 characters")
    .max(100, "Bank name must be less than 100 characters")
    .optional(),
  accountHolderName: z
    .string()
    .min(2, "Account holder name must be at least 2 characters")
    .max(100, "Account holder name must be less than 100 characters")
    .optional(),
  accountNumber: z
    .string()
    .min(9, "Account number must be at least 9 digits")
    .max(18, "Account number must be less than 18 characters")
    .regex(/^[0-9]+$/, "Account number must contain only digits")
    .optional(),
  ifscCode: z
    .string()
    .length(11, "IFSC code must be exactly 11 characters")
    .regex(/^[A-Z0-9]{11}$/, "IFSC code must be 11 alphanumeric characters")
    .optional(),
  branchName: z
    .string()
    .min(2, "Branch name must be at least 2 characters")
    .max(100, "Branch name must be less than 100 characters")
    .optional(),
  isActive: z.boolean().optional(),
});
