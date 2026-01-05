import UserModel from "../models/user.model";
import OtpModel from "../models/otp.model";
import UserDeviceModel from "../models/userDevice.model";
import { Types } from "mongoose";
import { User } from "../types/user.type";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

export const UserService = {
  async createUser(user: User) {
    // calculate expiresAt if payment info present or default free month
    const now = new Date();
    const durationDays = (user.payment && user.payment.durationDays) || 30;
    const expiresAt = user.payment && user.payment.expiresAt ? new Date(user.payment.expiresAt as any) : new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const payload: any = {
      ...user,
      payment: {
        type: (user.payment && user.payment.type) || "free",
        startDate: (user.payment && user.payment.startDate) || now,
        durationDays,
        expiresAt,
      },
    };

    const created = await UserModel.create(payload);
    return created.toObject();
  },

  async getUser(id: string) {
    const found = await UserModel.findById(id).lean();
    return found || null;
  },

  async findByEmail(email: string) {
    const found = await UserModel.findOne({ email }).lean();
    return found || null;
  },

  async setInactive(id: string) {
    return UserModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
  },

  async upsertDevice(userId: string, deviceInfo: any) {
    const now = new Date();
    const deviceId = deviceInfo.deviceId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const type = (deviceInfo.type || "unknown").toLowerCase();
    const category = ((type === "laptop" || type === "pc") ? "laptop" : (type === "tablet" || type === "mobile" ? "mobile" : "other")) as "mobile" | "laptop" | "other";

    // ensure user exists
    const user = await UserModel.findById(userId);
    if (!user) throw new Error("User not found");

    // find existing device
    const existing = await UserDeviceModel.findOne({ userId: new Types.ObjectId(userId), deviceId });
    if (existing) {
      (existing as any).lastSeen = now;
      (existing as any).userAgent = deviceInfo.userAgent || (existing as any).userAgent;
      (existing as any).ip = deviceInfo.ip || (existing as any).ip;
      (existing as any).platform = deviceInfo.platform || (existing as any).platform;
      (existing as any).name = deviceInfo.name || (existing as any).name;
      (existing as any).companyBrand = deviceInfo.companyBrand || (existing as any).companyBrand;
      (existing as any).companyDevice = deviceInfo.companyDevice || (existing as any).companyDevice;
      (existing as any).companyModel = deviceInfo.companyModel || (existing as any).companyModel;
      (existing as any).appVersion = deviceInfo.appVersion || (existing as any).appVersion;
      await existing.save();
      return { deviceId, updated: true };
    }

    // enforce limits per user
    const devices = await UserDeviceModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: 1 }).lean();
    const mobileCount = devices.filter((x: any) => x.category === "mobile").length;
    const laptopCount = devices.filter((x: any) => x.category === "laptop").length;

    // remove oldest in category if limit exceeded
    if (category === "mobile" && mobileCount >= 2) {
      const oldest = devices.filter((x: any) => x.category === "mobile")[0];
      if (oldest) await UserDeviceModel.deleteOne({ _id: (oldest as any)._id });
    }
    if (category === "laptop" && laptopCount >= 1) {
      const oldest = devices.filter((x: any) => x.category === "laptop")[0];
      if (oldest) await UserDeviceModel.deleteOne({ _id: (oldest as any)._id });
    }

    // enforce total limit 3
    let curDevices = await UserDeviceModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: 1 }).lean();
    while (curDevices.length >= 3) {
      await UserDeviceModel.deleteOne({ _id: (curDevices[0] as any)._id });
      curDevices.shift();
    }

    // create new device
    const created = await UserDeviceModel.create({
      userId: new Types.ObjectId(userId),
      deviceId,
      type,
      category,
      platform: deviceInfo.platform,
      companyBrand: deviceInfo.companyBrand,
      companyDevice: deviceInfo.companyDevice,
      companyModel: deviceInfo.companyModel,
      appVersion: deviceInfo.appVersion,
      userAgent: deviceInfo.userAgent,
      ip: deviceInfo.ip,
      name: deviceInfo.name,
      lastSeen: now,
      createdAt: now,
    });
    return { deviceId, updated: false };
  },

  generateOtp(): string {
    // Generate 6-digit OTP
    // return Math.floor(100000 + Math.random() * 900000).toString();
    return "000000"
  },

  async saveOtp(email: string, otp: string) {
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const updated = await UserModel.findOneAndUpdate(
      { email },
      { resetOtp: otp, resetOtpExpiry: expiry },
      { new: true }
    ).lean();
    return updated;
  },

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const user = await UserModel.findOne({ email }).lean();
    if (!user) return false;
    if (!user.resetOtp || !user.resetOtpExpiry) return false;

    // Check if OTP matches and not expired
    const isValid = user.resetOtp === otp && new Date(user.resetOtpExpiry) > new Date();
    return isValid;
  },

  async clearOtp(email: string) {
    await UserModel.findOneAndUpdate(
      { email },
      { $unset: { resetOtp: "", resetOtpExpiry: "" } }
    );
  },

  async updatePassword(userId: string, hashedPassword: string) {
    return UserModel.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    ).lean();
  },

  // Mobile OTP Authentication Methods
  async findByPhone(phone: string, countryCode: string) {
    const found = await UserModel.findOne({ phone, countryCode }).populate('userDevices').lean();
    return found || null;
  },

  async createUserByPhone(data: { fullName: string; phone: string; countryCode: string }, opts?: { isActive?: boolean }) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const isActive = opts && typeof opts.isActive === 'boolean' ? opts.isActive : true;

    const created = await UserModel.create({
      fullName: data.fullName,
      phone: data.phone,
      countryCode: data.countryCode,
      name: data.fullName, // Set name same as fullName for compatibility
      isActive: isActive,
      payment: {
        type: "free",
        startDate: now,
        durationDays: 30,
        expiresAt,
      },
    });

    return created.toObject();
  },

  async saveLoginOtp(phone: string, countryCode: string, otp: string, opts?: { purpose?: 'signup' | 'login'; fullName?: string; deviceInfo?: any }) {
    const now = new Date();
    const cooldownSeconds = 60; // 60s between sends
    const windowMs = 60 * 60 * 1000; // 1 hour window
    const maxPerWindow = 5; // max sends per window

    // For login calls, ensure user exists. For signup, user may not yet exist.
    if (!opts || opts.purpose !== 'signup') {
      const user = await UserModel.findOne({ phone, countryCode }).lean();
      if (!user) throw new Error('User not found');
    }

    // fetch existing otp doc
    const doc: any = await OtpModel.findOne({ phone, countryCode });

    // Check cooldown
    if (doc && doc.sentAt) {
      const diff = now.getTime() - new Date(doc.sentAt).getTime();
      if (diff < cooldownSeconds * 1000) {
        const retryAfter = Math.ceil((cooldownSeconds * 1000 - diff) / 1000);
        const err: any = new Error(`OTP was sent recently. Please wait ${retryAfter} seconds.`);
        err.name = 'RateLimitError';
        err.retryAfter = retryAfter;
        throw err;
      }
    }

    // Check window count
    let windowStart = doc && doc.windowStart ? new Date(doc.windowStart) : null;
    let count = doc && doc.sendCount ? doc.sendCount : 0;
    if (!windowStart || now.getTime() - windowStart.getTime() > windowMs) {
      windowStart = now;
      count = 1;
    } else {
      if (count >= maxPerWindow) {
        const retryAfter = Math.ceil((windowMs - (now.getTime() - windowStart.getTime())) / 1000);
        const err: any = new Error(`OTP send limit exceeded. Try again in ${retryAfter} seconds.`);
        err.name = 'RateLimitError';
        err.retryAfter = retryAfter;
        throw err;
      }
      count += 1;
    }

    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const updatePayload: any = {
      otp,
      expiry,
      sentAt: now,
      sendCount: count,
      windowStart,
      deviceMeta: (opts && opts.deviceInfo) || {},
      purpose: (opts && opts.purpose) || 'login'
    };

    if (opts && opts.purpose === 'signup') {
      if (opts.fullName) updatePayload.pendingFullName = opts.fullName;
      if (phone) updatePayload.phone = phone;
      if (countryCode) updatePayload.countryCode = countryCode;
    }

    const updated = await OtpModel.findOneAndUpdate(
      { phone, countryCode },
      updatePayload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return updated;
  },

  async verifyLoginOtp(phone: string, countryCode: string, otp: string, deviceMeta: any): Promise<{ doc?: any; isValid: boolean }> {

    const query: any = {
      phone,
      countryCode
    };

    // Match only available fields
    if (deviceMeta && deviceMeta.deviceId) {
      query["deviceMeta.deviceId"] = deviceMeta.deviceId;
    }
    if (deviceMeta && deviceMeta.companyBrand) {
      query["deviceMeta.companyBrand"] = deviceMeta.companyBrand;
    }
    if (deviceMeta && deviceMeta.companyDevice) {
      query["deviceMeta.companyDevice"] = deviceMeta.companyDevice;
    }
    if (deviceMeta && deviceMeta.companyModel) {
      query["deviceMeta.companyModel"] = deviceMeta.companyModel;
    }
    if (deviceMeta && deviceMeta.appVersion) {
      query["deviceMeta.appVersion"] = deviceMeta.appVersion;
    }

    // Fetch mutable doc so we can update status
    const doc: any = await OtpModel.findOne(query);
    if (!doc) return { isValid: false };
    if (!doc.otp || !doc.expiry) return { isValid: false };

    const notExpired = new Date(doc.expiry) > new Date();

    if (!notExpired) {
      await OtpModel.findOneAndUpdate({ _id: doc._id }, { status: 'expired' });
      return { isValid: false };
    } else {
      await OtpModel.findOneAndUpdate({ _id: doc._id }, { status: 'used' });
    }

    const isValid = (doc.otp === otp) && notExpired;

    return { doc: doc.toObject ? doc.toObject() : doc, isValid };
  },

  async clearLoginOtp(phone: string, countryCode: string) {
    await OtpModel.findOneAndDelete({ phone, countryCode });
  },

  async activateUser(userId: string, deviceInfo?: any) {
    const updated = await UserModel.findByIdAndUpdate(userId, { isActive: true }, { new: true }).lean();
    if (deviceInfo) {
      try {
        await (this as any).upsertDevice(userId, deviceInfo);
      } catch (err) {
        console.error('Device upsert failed during activateUser:', err);
      }
    }
    return updated;
  },

  // Social login helpers
  async upsertSocialUser(params: { email: string; fullName?: string; image?: string; provider: 'google' | 'apple'; providerId: string }) {
    const { email, fullName, image, provider, providerId } = params;
    const name = fullName || (email ? email.split('@')[0] : 'User');
    const update: any = {
      name,
      fullName: fullName || name,
      image,
      isActive: true,
    };
    update[`${provider}Id`] = providerId;
    const user = await UserModel.findOneAndUpdate(
      { email },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return user;
  },

  async verifyGoogleIdToken(idToken: string) {
    if (!idToken) throw new Error('Missing Google id token');
    //   const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    // const resp = await axios.get(url);
    // const data = resp.data;
    // // optional audience check
    // if (env.googleClientId && data.aud && data.aud !== env.googleClientId) {
    //   throw new Error('Invalid Google token audience');
    // }
    // Use google-auth-library for robust verification
    const client = new OAuth2Client(env.googleClientId || undefined);
    const ticket: any = await client.verifyIdToken({ idToken, audience: env.googleClientId || undefined });
    const data: any = ticket.getPayload() || {};
    return {
      email: data.email,
      emailVerified: data.email_verified === 'true' || data.email_verified === true,
      name: data.name,
      picture: data.picture,
      sub: data.sub,
    };
  },

  async loginWithGoogle(idToken: string) {
    const payload = await (this as any).verifyGoogleIdToken(idToken);
    if (!payload.email) throw new Error('Google token did not contain email');
    const user = await (this as any).upsertSocialUser({
      email: payload.email,
      fullName: payload.name,
      image: payload.picture,
      provider: 'google',
      providerId: payload.sub,
    });
    return user;
  },

  // Apple: fetch jwks and verify token using crypto.createPublicKey with JWK
  _appleJwksCache: {} as any,

  async _getAppleJwks() {
    const cache = (this as any)._appleJwksCache || {};
    const now = Date.now();
    if (cache.keys && cache.fetchedAt && now - cache.fetchedAt < 1000 * 60 * 60) {
      return cache.keys;
    }
    const resp = await axios.get('https://appleid.apple.com/auth/keys');
    const keys = resp.data.keys || [];
    (this as any)._appleJwksCache = { keys, fetchedAt: now };
    return keys;
  },

  async verifyAppleIdToken(idToken: string) {
    if (!idToken) throw new Error('Missing Apple id token');
    const decoded: any = jwt.decode(idToken, { complete: true });
    if (!decoded || !decoded.header) throw new Error('Invalid Apple token');
    const kid = decoded.header.kid;
    const alg = decoded.header.alg;
    const keys = await (this as any)._getAppleJwks();
    const jwk = keys.find((k: any) => k.kid === kid && k.alg === alg);
    if (!jwk) throw new Error('Apple public key not found for token');
    // Convert JWK to PEM using crypto.createPublicKey
    const publicKey = crypto.createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' }).export({ type: 'spki', format: 'pem' });
    const options: any = { algorithms: ['RS256'], issuer: 'https://appleid.apple.com' };
    if (env.appleAudience) options.audience = env.appleAudience;
    else if (env.appleClientId) options.audience = env.appleClientId;
    const payload = jwt.verify(idToken, publicKey as any, options) as any;
    return payload;
  },

  async loginWithApple(idToken: string) {
    const payload = await (this as any).verifyAppleIdToken(idToken);
    const email = payload.email;
    if (!email) throw new Error('Apple token did not contain email');
    const user = await (this as any).upsertSocialUser({
      email,
      fullName: payload.name && (payload.name.firstName || payload.name.lastName) ? `${payload.name.firstName || ''} ${payload.name.lastName || ''}`.trim() : undefined,
      image: undefined,
      provider: 'apple',
      providerId: payload.sub,
    });
    return user;
  },

  async updateUserProfile(userId: string, data: { image?: string; dob?: Date; fullName?: string; email?: string }) {
    const updateData: any = {};
    if (data.image !== undefined) updateData.image = data.image;
    if (data.dob !== undefined) updateData.dob = data.dob;
    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName;
      updateData.name = data.fullName; // Keep name in sync
    }
    if (data.email !== undefined) updateData.email = data.email;

    return UserModel.findByIdAndUpdate(userId, updateData, { new: true }).lean();
  },

  // Migration helper: move legacy loginOtp and devices to new collections
  async migrateOtpAndDevices() {
    // Migrate loginOtp -> OtpModel
    const usersWithOtp = await UserModel.find({ $or: [{ loginOtp: { $exists: true, $ne: null } }, { loginOtpExpiry: { $exists: true, $ne: null } }] });
    for (const u of usersWithOtp) {
      try {
        const phone = u.phone;
        const countryCode = u.countryCode;
        const otp = u.loginOtp;
        const expiry = u.loginOtpExpiry;
        if (phone && countryCode && otp && expiry) {
          await OtpModel.findOneAndUpdate({ phone, countryCode }, { otp, expiry, sentAt: u.updatedAt || new Date() }, { upsert: true });
          await UserModel.findByIdAndUpdate(u._id, { $unset: { loginOtp: "", loginOtpExpiry: "" } });
        }
      } catch (err) {
        console.error('OTP migration failed for user', u._id, err);
      }
    }

    // Migrate devices -> UserDeviceModel
    const usersWithDevices = await UserModel.find({ devices: { $exists: true, $ne: [] } });
    for (const u of usersWithDevices) {
      try {
        const arr = u.devices || [];
        for (const d of arr) {
          await UserDeviceModel.findOneAndUpdate(
            { userId: u._id, deviceId: d.deviceId },
            {
              userId: u._id,
              deviceId: d.deviceId,
              type: d.type,
              category: d.category,
              platform: d.platform,
              userAgent: d.userAgent,
              ip: d.ip,
              name: d.name,
              lastSeen: d.lastSeen || d.createdAt,
              createdAt: d.createdAt || new Date()
            },
            { upsert: true }
          );
        }
        // Optionally keep devices array or clear it – we clear to avoid duplication
        await UserModel.findByIdAndUpdate(u._id, { $unset: { devices: "" } });
      } catch (err) {
        console.error('Device migration failed for user', u._id, err);
      }
    }

    return { migratedOtps: usersWithOtp.length, migratedDeviceUsers: usersWithDevices.length };
  },
};
