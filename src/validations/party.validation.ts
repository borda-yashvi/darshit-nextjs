import { z } from "zod";

// Create Party schema
export const createPartySchema = z.object({
    partyName: z.string().min(1, "Party name is required").min(2, "Party name must be at least 2 characters"),
    mobile: z.string().min(10, "Mobile number must be at least 10 digits").optional(),
    gstNo: z.string().optional(),
    address: z.string().optional(),
});

// Update Party schema
export const updatePartySchema = z.object({
    partyName: z.string().min(2, "Party name must be at least 2 characters").optional(),
    mobile: z.string().min(10, "Mobile number must be at least 10 digits").optional(),
    gstNo: z.string().optional(),
    address: z.string().optional(),
});
