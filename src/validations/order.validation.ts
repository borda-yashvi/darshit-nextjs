import { z } from "zod";

// Create Order schema
export const createOrderSchema = z.object({
    orderNo: z.coerce.number().positive("Order number must be a positive number"),
    date: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date format"),
    machineNo: z.string().optional(),
    saller: z.string().optional(),
    designNo: z.string().optional(),
    pick: z.coerce.number().int().positive("Pick must be a positive integer").optional(),
    qty: z.string().optional(),
    totalMtrRepit: z.coerce.number().positive("Total Mtr Repit must be positive").optional(),
    totalColor: z.coerce.number().int().positive("Total Color must be positive").optional(),
    party: z.string().optional(),
});

// Update Order schema
export const updateOrderSchema = z.object({
    orderNo: z.coerce.number().positive("Order number must be a positive number").optional(),
    date: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date format").optional(),
    machineNo: z.string().optional(),
    saller: z.string().optional(),
    designNo: z.string().optional(),
    pick: z.coerce.number().int().positive("Pick must be a positive integer").optional(),
    qty: z.string().optional(),
    totalMtrRepit: z.coerce.number().positive("Total Mtr Repit must be positive").optional(),
    totalColor: z.coerce.number().int().positive("Total Color must be positive").optional(),
    party: z.string().optional(),
});

// Order Row schema
export const orderRowSchema = z.object({
    orderIndex: z.coerce.number().int().nonnegative("Order index must be non-negative").optional(),
    f1: z.string().optional(),
    f2: z.string().optional(),
    f3: z.string().optional(),
    f4: z.string().optional(),
    f5: z.string().optional(),
    f6: z.string().optional(),
    qty: z.string().optional(),
    repit: z.coerce.number().optional(),
    total: z.coerce.number().optional(),
});

// Create Order With Rows schema
export const createOrderWithRowsSchema = createOrderSchema.extend({
    rows: z.preprocess(
        (val) => {
            if (val === undefined || val === null || val === "") {
                return undefined;
            }
            if (typeof val === "string") {
                try {
                    return JSON.parse(val);
                } catch (e) {
                    return val; // Return invalid string to let Zod handle it
                }
            }
            return val;
        },
        z.lazy(() =>
            z.union([
                z.undefined(),
                z.null().transform(() => undefined),
                z.array(orderRowSchema),
            ])
        )
    ),
});

// Update Order With Rows schema
export const updateOrderWithRowsSchema = updateOrderSchema.extend({
    rows: z.preprocess(
        (val) => {
            if (val === undefined || val === null || val === "") {
                return undefined;
            }
            if (typeof val === "string") {
                try {
                    return JSON.parse(val);
                } catch (e) {
                    return val;
                }
            }
            return val;
        },
        z.lazy(() =>
            z.union([
                z.undefined(),
                z.null().transform(() => undefined),
                z.array(
                    orderRowSchema.extend({
                        _id: z.string().optional(),
                        id: z.string().optional(),
                        isAdded: z.string().optional(),
                        isDeleted: z.string().optional(),
                        isUpdated: z.string().optional(),
                    })
                ),
            ])
        )
    ),
});

// Reorder Rows schema
export const reorderRowsSchema = z.array(z.string()).min(1, "At least one order ID is required")
