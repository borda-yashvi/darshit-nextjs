import { z } from "zod";

// Create OrderTable Row schema
export const createOrderTableRowSchema = z.object({
    orderIndex: z.number().int().nonnegative("Order index must be non-negative").optional(),
    f1: z.string().optional(),
    f2: z.string().optional(),
    f3: z.string().optional(),
    f4: z.string().optional(),
    f5: z.string().optional(),
    f6: z.string().optional(),
    qty: z.string().optional(),
    repit: z.number().optional(),
    total: z.number().optional(),
});

// Update OrderTable Row schema
export const updateOrderTableRowSchema = z.object({
    f1: z.string().optional(),
    f2: z.string().optional(),
    f3: z.string().optional(),
    f4: z.string().optional(),
    f5: z.string().optional(),
    f6: z.string().optional(),
    qty: z.string().optional(),
    repit: z.number().optional(),
    total: z.number().optional(),
});

// Add Multiple Rows schema
export const addMultipleRowsSchema = z.object({
    rows: z.array(createOrderTableRowSchema).min(1, "At least one row is required"),
});
