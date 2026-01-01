import { z } from "zod";

// Signup schema
export const signupSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    countryCode: z.string().regex(/^\+\d{1,4}$/, "Invalid country code format (e.g., +91)"),
});

// Send OTP schema
export const sendOtpSchema = z.object({
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    countryCode: z.string().regex(/^\+\d{1,4}$/, "Invalid country code format (e.g., +91)"),
    company_brand: z.string().optional(),
    company_device: z.string().optional(),
    company_model: z.string().optional(),
    app_version: z.string().optional(),
    device_id: z.string(),
});

// Verify OTP schema
export const verifyOtpSchema = z.object({
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    countryCode: z.string().regex(/^\+\d{1,4}$/, "Invalid country code format (e.g., +91)"),
    otp: z.string().length(6, "OTP must be exactly 6 digits"),
    company_brand: z.string().optional(),
    company_device: z.string().optional(),
    company_model: z.string().optional(),
    app_version: z.string().optional(),
    device_id: z.string(),
});

// Resend OTP schema
export const resendOtpSchema = z.object({
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    countryCode: z.string().regex(/^\+\d{1,4}$/, "Invalid country code format (e.g., +91)"),
});

// Update Profile schema
export const updateProfileSchema = z.object({
    image: z.string().url("Invalid image URL").optional(),
    dob: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date format").optional(),
    fullName: z.string().min(1, "Full name cannot be empty").optional(),
});
