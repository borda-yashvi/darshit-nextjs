import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserService } from "../services/user.service";
import bcrypt from "bcryptjs";
import { successResponse, errorResponse } from "../utils/response.util";
import { de } from "zod/v4/locales";


export const UserController = {
  async register(req: Request, res: Response) {
    try {
      const uri = env.mongoUri;

      if (!uri) {
        throw new Error("MONGODB_URI not found");
      }

      const { email, password, name = '', mobile = '' } = req.body;

      if (!email || !password || !name) {
        return errorResponse(res, 400, "Missing required fields");
      }
      // hash password
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);

      // Create user + profile with default free-month payment
      const userProfile = await UserService.createUser({
        email,
        password: hashed,
        name,
        mobile,
      });

      // Create JWT token
      const token = jwt.sign(
        { id: userProfile._id, email: userProfile.email },
        env.jwtSecret,
        { expiresIn: "7d" }
      );

      return successResponse(res, {
        user: userProfile,
        token,
      });

    } catch (error: any) {
      return errorResponse(res, 500, "Internal Server Error", { error: error.message });
    }
  },

  async profile(req: Request & { user?: any }, res: Response) {
    try {
      const user = await UserService.getUser(req.user.id);
      const uri = env.mongoUri;

      if (!uri) {
        throw new Error("MONGODB_URI not found");
      }
      if (!user) return errorResponse(res, 404, "User not found");
      return successResponse(res, { user });
    } catch (err: any) {
      return errorResponse(res, 500, "Internal Server Error", { error: err.message });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const uri = env.mongoUri;

      if (!uri) {
        throw new Error("MONGODB_URI not found");
      }
      const { email, password } = req.body;
      if (!email || !password) return errorResponse(res, 400, "Missing email or password");
      const user = await UserService.findByEmail(email);
      if (!user) return errorResponse(res, 401, "Invalid credentials");

      const match = await bcrypt.compare(password, (user as any).password || "");
      if (!match) return errorResponse(res, 401, "Invalid credentials");

      const token = jwt.sign({ id: (user as any)._id, email: user.email }, env.jwtSecret, { expiresIn: "7d" });

      // handle device registration/auto-catchup (include company/device metadata)
      const deviceInfo = {
        deviceId: req.body.deviceId || req.body.device_id || req.header("x-device-id"),
        type: req.body.deviceType || req.body.company_device || req.header("x-device-type") || "unknown",
        platform: req.body.platform || req.body.company_brand || req.header("x-device-platform"),
        companyBrand: req.body.company_brand || undefined,
        companyDevice: req.body.company_device || undefined,
        companyModel: req.body.company_model || undefined,
        appVersion: req.body.app_version || undefined,
        userAgent: req.header("user-agent") || req.body.userAgent || `${req.body.company_brand || ""} ${req.body.company_model || ""} v${req.body.app_version || ""}`.trim(),
        ip: req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress,
        name: req.body.deviceName || req.body.name || req.body.company_model,
      };

      let deviceResult = { deviceId: null } as any;
      try {
        deviceResult = await UserService.upsertDevice((user as any)._id, deviceInfo);
      } catch (err) {
        // device registration shouldn't block login; log and continue
        console.error("Device upsert failed:", err);
      }

      return successResponse(res, { user: { ...user, token, deviceId: deviceResult.deviceId || deviceInfo.deviceId } });
    } catch (err: any) {
      return errorResponse(res, 500, "Internal Server Error", { error: err.message });
    }
  },

  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) return errorResponse(res, 400, "Email is required");

      // Check if user exists
      const user = await UserService.findByEmail(email);
      if (!user) {
        // For security, don't reveal if email exists
        return successResponse(res, { message: "If the email exists, an OTP has been sent" });
      }

      // Generate OTP
      const otp = UserService.generateOtp();

      // Save OTP to database
      await UserService.saveOtp(email, otp);

      // Send OTP via email
      const { EmailService } = await import("../services/email.service");
      try {
        await EmailService.sendOtpEmail(email, otp);
      } catch (emailError: any) {
        console.error("Failed to send OTP email:", emailError);
        return errorResponse(res, 500, "Failed to send OTP email");
      }

      return successResponse(res, { message: "OTP sent to your email" });
    } catch (err: any) {
      return errorResponse(res, 500, "Internal Server Error", { error: err.message });
    }
  },

  async resetPassword(req: Request, res: Response) {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return errorResponse(res, 400, "Email, OTP, and new password are required");
      }

      // Verify OTP
      const isValidOtp = await UserService.verifyOtp(email, otp);
      if (!isValidOtp) {
        return errorResponse(res, 400, "Invalid or expired OTP");
      }

      // Get user
      const user = await UserService.findByEmail(email);
      if (!user) {
        return errorResponse(res, 404, "User not found");
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      await UserService.updatePassword(String((user as any)._id), hashedPassword);

      // Clear OTP
      await UserService.clearOtp(email);

      return successResponse(res, { message: "Password reset successfully" });
    } catch (err: any) {
      return errorResponse(res, 500, "Internal Server Error", { error: err.message });
    }
  },

  async changePassword(req: Request & { user?: any }, res: Response) {
    try {
      const userId = req.user.id;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return errorResponse(res, 400, "Old password and new password are required");
      }

      // Get user with password
      const user = await UserService.getUser(userId);
      if (!user) {
        return errorResponse(res, 404, "User not found");
      }

      // Verify old password
      const isValidPassword = await bcrypt.compare(oldPassword, (user as any).password || "");
      if (!isValidPassword) {
        return errorResponse(res, 401, "Old password is incorrect");
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      await UserService.updatePassword(userId, hashedPassword);

      return successResponse(res, { message: "Password changed successfully" });
    } catch (err: any) {
      return errorResponse(res, 500, "Internal Server Error", { error: err.message });
    }
  },

  // ===== MOBILE OTP AUTHENTICATION ENDPOINTS =====

  async signup(req: Request, res: Response) {
    try {
      const { signupSchema } = await import("../validations/auth.validation");
      const validation = signupSchema.safeParse(req.body);

      if (!validation.success) {
        return errorResponse(res, 400, validation.error.issues[0].message);
      }

      const { fullName, phone, countryCode } = validation.data;

      // Check if user already exists (allow pending/inactive users to continue signup)
      const existingUser = await UserService.findByPhone(phone, countryCode);
      if (existingUser && existingUser.isActive) {
        return errorResponse(res, 409, "Phone number already registered");
      }

      // Create or ensure pending user record (do NOT store device info on the user yet)
      let user;
      if (!existingUser) {
        try {
          user = await UserService.createUserByPhone({ fullName, phone, countryCode }, { isActive: false });
        } catch (e: any) {
          return errorResponse(res, 500, "Failed to create user", { error: e.message });
        }
      } else {
        // existing but inactive - keep as pending
        user = existingUser;
      }

      // Generate OTP and store device metadata in OTP (temporary)
      const otp = UserService.generateOtp();
      const anyReq: any = req;
      const deviceInfo = {
        deviceId: anyReq.body.device_id || anyReq.body.deviceId || "",
        type: anyReq.body.company_device || "mobile",
        platform: anyReq.body.company_brand || "",
        companyBrand: anyReq.body.company_brand || "",
        companyDevice: anyReq.body.company_device || "",
        companyModel: anyReq.body.company_model || "",
        appVersion: anyReq.body.app_version || "",
        userAgent: `${anyReq.body.company_brand || ""} ${anyReq.body.company_model || ""} v${anyReq.body.app_version || ""}`.trim(),
        // ip: req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress,
        name: anyReq.body.company_model || "",
      };

      try {
        await UserService.saveLoginOtp(phone, countryCode, otp, { purpose: 'signup', fullName, deviceInfo });
      } catch (e: any) {
        if (e.name === "RateLimitError") {
          return errorResponse(res, 429, e.message, { retryAfter: e.retryAfter });
        }
        return errorResponse(res, 500, "Failed to save OTP", { error: e.message });
      }

      const { SmsService } = await import("../services/sms.service");
      try {
        await SmsService.sendOtpSms(phone, countryCode, otp);
      } catch (smsError: any) {
        console.error("Failed to send OTP SMS on signup:", smsError);
        return errorResponse(res, 500, "Failed to send OTP");
      }

      return successResponse(res, {
        message: "OTP sent. Verify to complete signup",
        phone,
      });
    } catch (err: any) {
      return errorResponse(res, 500, "Internal Server Error", { error: err.message });
    }
  },

  async sendOtp(req: Request, res: Response) {
    try {
      const { sendOtpSchema } = await import("../validations/auth.validation");
      const validation = sendOtpSchema.safeParse(req.body);

      if (!validation.success) {
        return errorResponse(res, 400, validation.error.issues[0].message);
      }

      const { phone, countryCode, company_brand, company_device, device_id, company_model, app_version } = validation.data;

      // Check if user exists
      const user = await UserService.findByPhone(phone, countryCode);
      if (!user) {
        return errorResponse(res, 404, "User not found. Please signup first.");
      }
      if (user?.devices?.length >= 3) {
        return errorResponse(res, 403, "Device limit reached. Please register a new device.");
      }

      // Generate 6-digit OTP
      const otp = UserService.generateOtp();
      const deviceInfo = {
        deviceId: device_id || "",
        type: company_device || "mobile",
        platform: company_brand || "",
        name: company_model || "",
        companyBrand: company_brand || "",
        companyDevice: company_device || "",
        companyModel: company_model || "",
        appVersion: app_version || "",
        userAgent: `${company_brand || ""} ${company_model || ""} v${app_version || ""}`.trim(),
      }
      // Save OTP to database with rate-limit checks
      try {
        await UserService.saveLoginOtp(phone, countryCode, otp, { purpose: 'login', deviceInfo });
      } catch (e: any) {
        if (e.name === "RateLimitError") {
          return errorResponse(res, 429, e.message, { retryAfter: e.retryAfter });
        }
        return errorResponse(res, 500, "Failed to save OTP", { error: e.message });
      }

      // Update device info if provided
      if (company_brand || company_device || company_model || device_id || app_version) {
        await UserService.upsertDevice(String((user as any)._id), deviceInfo);
      }

      // Send OTP via SMS
      const { SmsService } = await import("../services/sms.service");
      try {
        await SmsService.sendOtpSms(phone, countryCode, otp);
      } catch (smsError: any) {
        console.error("Failed to send OTP SMS:", smsError);
        return errorResponse(res, 500, "Failed to send OTP");
      }

      return successResponse(res, { message: "OTP sent successfully" });
    } catch (err: any) {
      return errorResponse(res, 500, "Internal Server Error", { error: err.message });
    }
  },

  async verifyOtp(req: Request, res: Response) {
    try {
      const { verifyOtpSchema } = await import("../validations/auth.validation");
      const validation = verifyOtpSchema.safeParse(req.body);

      if (!validation.success) {
        return errorResponse(res, 400, validation.error.issues[0].message);
      }

      const { phone, countryCode, otp, company_brand, company_device, device_id, company_model, app_version } = validation.data;

      // Verify OTP
      const { isValid, doc: otpDoc } = await UserService.verifyLoginOtp(phone, countryCode, otp, {
        deviceId: device_id,
        companyBrand: company_brand,
        companyDevice: company_device,
        companyModel: company_model,
        appVersion: app_version
      });
      if (!isValid) {
        return errorResponse(res, 401, "Invalid or expired OTP");
      }

      // Get user (may not exist for signup flow)
      let user = await UserService.findByPhone(phone, countryCode);

      // Prepare device metadata from OTP or request body — used for activation as well
      const deviceMeta = (otpDoc && otpDoc.deviceMeta) || {
        deviceId: device_id || "",
        type: company_device || "mobile",
        platform: company_brand || "",
        name: company_model || "",
        appVersion: app_version || "",
        userAgent: `${company_brand || ""} ${company_model || ""} v${app_version || ""}`.trim(),
        ip: req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress,
      };

      // If signup flow and user doesn't exist, create user now using pending data (activate user)
      if (!user && otpDoc && otpDoc.purpose === 'signup') {
        try {
          const fullNameToUse = otpDoc.pendingFullName || req.body.fullName;
          user = await UserService.createUserByPhone({ fullName: fullNameToUse, phone, countryCode }, { isActive: true });
        } catch (err: any) {
          return errorResponse(res, 500, "Failed to create user on OTP verification", { error: err.message });
        }
      } else if (user && otpDoc && otpDoc.purpose === 'signup' && !user.isActive) {
        // Existing pending user — activate them now and register device during activation
        try {
          const updated = await UserService.activateUser(String((user as any)._id), deviceMeta);
          user = updated || user;
        } catch (err: any) {
          return errorResponse(res, 500, "Failed to activate user on OTP verification", { error: err.message });
        }
      }

      if (!user) {
        return errorResponse(res, 404, "User not found");
      }

      // Register device using OTP-stored metadata first, fall back to request body (skip if activation already registered it)
      try {
        await UserService.upsertDevice(String((user as any)._id), deviceMeta);
      } catch (err: any) {
        // device registration shouldn't block login; log and continue
        console.error("Device upsert failed during verifyOtp:", err);
      }

      // Clear OTP
      await UserService.clearLoginOtp(phone, countryCode);

      // Generate JWT token
      const token = jwt.sign({ id: (user as any)._id, deviceId: deviceMeta.deviceId }, env.jwtSecret || "default_secret", {
        expiresIn: "30d",
      });

      return successResponse(res, {
        message: "Login successful",
        user: {
          token,
          id: (user as any)._id,
          fullName: user.fullName,
          phone: user.phone,
          countryCode: user.countryCode,
          image: user.image,
          dob: user.dob,
        },
      });

    } catch (err: any) {
      return errorResponse(res, 500, "Internal Server Error", { error: err.message });
    }
  },

  async resendOtp(req: Request, res: Response) {
    try {
      const { resendOtpSchema } = await import("../validations/auth.validation");
      const validation = resendOtpSchema.safeParse(req.body);

      if (!validation.success) {
        return errorResponse(res, 400, validation.error.issues[0].message);
      }

      const { phone, countryCode } = validation.data;

      // Check if user exists
      const user = await UserService.findByPhone(phone, countryCode);
      if (!user) {
        return errorResponse(res, 404, "User not found. Please signup first.");
      }

      // Generate new OTP
      const otp = UserService.generateOtp();

      // Save OTP to database with rate-limit checks
      try {
        await UserService.saveLoginOtp(phone, countryCode, otp);
      } catch (e: any) {
        if (e.name === "RateLimitError") {
          return errorResponse(res, 429, e.message, { retryAfter: e.retryAfter });
        }
        return errorResponse(res, 500, "Failed to save OTP", { error: e.message });
      }

      // Send OTP via SMS
      const { SmsService } = await import("../services/sms.service");
      try {
        await SmsService.sendOtpSms(phone, countryCode, otp);
      } catch (smsError: any) {
        console.error("Failed to send OTP SMS:", smsError);
        return errorResponse(res, 500, "Failed to send OTP");
      }

      return successResponse(res, { message: "OTP resent successfully" });
    } catch (err: any) {
      return errorResponse(res, 500, "Internal Server Error", { error: err.message });
    }
  },

  async updateProfileMobile(req: Request & { user?: any }, res: Response) {
    try {
      const userId = req.user.id;
      const anyReq: any = req;
      const file = anyReq.file;

      // Extract form fields
      const { dob, fullName, email } = anyReq.body;

      const updateData: any = {};

      // Handle image upload if file is present
      if (file && file.buffer) {
        const { uploadImage } = await import("../config/cloudinary");
        const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const uploaded = await uploadImage(dataUri, { folder: `users/${userId}/profile` });
        updateData.image = uploaded.secure_url || uploaded.url;
      }

      // Handle other fields
      if (dob) {
        const [day, month, year] = dob.split("/");
        updateData.dob = new Date(`${year}-${month}-${day}`);
      }
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;

      // Update profile
      const updatedUser = await UserService.updateUserProfile(userId, updateData);

      if (!updatedUser) {
        return errorResponse(res, 404, "User not found");
      }

      return successResponse(res, {
        message: "Profile updated successfully",
        user: {
          id: (updatedUser as any)._id,
          fullName: updatedUser.fullName,
          phone: updatedUser.phone,
          countryCode: updatedUser.countryCode,
          image: updatedUser.image,
          dob: updatedUser.dob,
          email: updatedUser.email,
          name: updatedUser.name,
        },
      });
    } catch (err: any) {
      return errorResponse(res, 500, "Internal Server Error", { error: err.message });
    }
  },
};
