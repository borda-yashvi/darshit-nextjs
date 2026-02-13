import { z } from "zod";

// User Register schema
export const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(1, "Name is required"),
    mobile: z.string().min(10, "Mobile number must be at least 10 digits").optional(),
});

// User Login schema
export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    deviceId: z.string().optional(),
    deviceType: z.string().optional(),
    platform: z.string().optional(),
    company_brand: z.string().optional(),
    company_device: z.string().optional(),
    company_model: z.string().optional(),
    app_version: z.string().optional(),
    device_id: z.string().optional(),
});

// Forgot Password schema
export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

// Reset Password schema
export const resetPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
    otp: z.string().length(6, "OTP must be exactly 6 digits"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

// Change Password schema
export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

// Update Profile Mobile schema
export const updateProfileMobileSchema = z.object({
    fullName: z.string().min(1, "Full name cannot be empty").optional(),
    dob: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date format").optional(),
    image: z.string().url("Invalid image URL").optional(),
    mobile: z.string().min(10, "Mobile number must be at least 10 digits").optional(),
    company_brand: z.string().optional(),
    company_device: z.string().optional(),
    company_model: z.string().optional(),
    app_version: z.string().optional(),
    device_id: z.string().optional(),
    email: z.string().email("Invalid email address"),
});

// Delete Profile schema
export const deleteProfileSchema = z.object({
    password: z.string().min(1, "Password is required"),
});

// Signup schema (from auth.validation.ts)
export const signupSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    countryCode: z.string().regex(/^\+\d{1,4}$/, "Invalid country code format (e.g., +91)"),
    company_brand: z.string().optional(),
    company_device: z.string().optional(),
    company_model: z.string().optional(),
    app_version: z.string().optional(),
    device_id: z.string().optional(),
});

// Send OTP schema (from auth.validation.ts)
export const sendOtpSchema = z.object({
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    countryCode: z.string().regex(/^\+\d{1,4}$/, "Invalid country code format (e.g., +91)"),
    company_brand: z.string().optional(),
    company_device: z.string().optional(),
    company_model: z.string().optional(),
    app_version: z.string().optional(),
    device_id: z.string(),
});

// Verify OTP schema (from auth.validation.ts)
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

// Resend OTP schema (from auth.validation.ts)
export const resendOtpSchema = z.object({
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    countryCode: z.string().regex(/^\+\d{1,4}$/, "Invalid country code format (e.g., +91)"),
    company_brand: z.string().optional(),
    company_device: z.string().optional(),
    company_model: z.string().optional(),
    app_version: z.string().optional(),
    device_id: z.string().optional(),
});

// Update Profile schema (from auth.validation.ts)
export const updateProfileSchema = z.object({
    image: z.string().url("Invalid image URL").optional(),
    dob: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date format").optional(),
    fullName: z.string().min(1, "Full name cannot be empty").optional(),
});
