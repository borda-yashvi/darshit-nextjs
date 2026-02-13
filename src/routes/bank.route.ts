import express from "express";
import { BankController } from "../controllers/bank.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { createBankSchema, updateBankSchema } from "../validations/bank.validation";

const router = express.Router();

// Create a new bank account
router.post(
  "/",
  authMiddleware,
  validateRequest(createBankSchema, "body"),
  BankController.createBank
);

// Get all bank accounts by user (with search and pagination)
router.get("/", authMiddleware, BankController.getBanksByUser);

// Get a specific bank account by ID
router.get("/:id", authMiddleware, BankController.getBankById);

// Update a bank account
router.put(
  "/:id",
  authMiddleware,
  validateRequest(updateBankSchema, "body"),
  BankController.updateBank
);

// Delete a bank account
router.delete("/:id", authMiddleware, BankController.deleteBank);

export default router;
