import UserModel from "../models/user.model";
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
    const doc = await UserModel.findById(userId);
    if (!doc) throw new Error("User not found");

    const now = new Date();
    const deviceId = deviceInfo.deviceId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const type = (deviceInfo.type || "unknown").toLowerCase();
    const category = ((type === "laptop" || type === "pc") ? "laptop" : (type === "tablet" || type === "mobile" ? "mobile" : "other")) as "mobile" | "laptop" | "other";

    // check if device exists
    const existingIndex = (doc.devices || []).findIndex((d: any) => d.deviceId === deviceId);
    if (existingIndex > -1) {
      // update lastSeen and metadata
      const d: any = doc.devices![existingIndex];
      d.lastSeen = now;
      d.userAgent = deviceInfo.userAgent || d.userAgent;
      d.ip = deviceInfo.ip || d.ip;
      d.platform = deviceInfo.platform || d.platform;
      d.name = deviceInfo.name || d.name;
      doc.markModified("devices");
      await doc.save();
      return { deviceId, updated: true };
    }

    // enforce limits: mobile/tablet -> max 2, laptop/pc -> max 1, total max 3
    const devices = doc.devices || [];
    const mobileCount = devices.filter((x: any) => x.category === "mobile").length;
    const laptopCount = devices.filter((x: any) => x.category === "laptop").length;

    // if adding would exceed category limits, remove oldest in that category
    if (category === "mobile" && mobileCount >= 2) {
      // remove oldest mobile
      const mobiles = devices.filter((x: any) => x.category === "mobile");
      mobiles.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const oldestId = mobiles[0].deviceId;
      doc.devices = devices.filter((x: any) => x.deviceId !== oldestId);
    }
    if (category === "laptop" && laptopCount >= 1) {
      const laptops = devices.filter((x: any) => x.category === "laptop");
      laptops.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const oldestId = laptops[0].deviceId;
      doc.devices = devices.filter((x: any) => x.deviceId !== oldestId);
    }

    // enforce total limit: if after removals total >=3, remove oldest overall
    let curDevices = doc.devices || [];
    if (curDevices.length >= 3) {
      curDevices.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      // remove oldest until length < 3
      while (curDevices.length >= 3) {
        curDevices.shift();
      }
      doc.devices = curDevices;
    }

    // push new device
    const newDevice = {
      deviceId,
      type,
      category,
      platform: deviceInfo.platform,
      userAgent: deviceInfo.userAgent,
      ip: deviceInfo.ip,
      name: deviceInfo.name,
      lastSeen: now,
      createdAt: now,
    };

    doc.devices = [...(doc.devices || []), newDevice as any];
    await doc.save();
    return { deviceId, updated: false };
  },

  generateOtp(): string {
    // Generate 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
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
    const found = await UserModel.findOne({ phone, countryCode }).lean();
    return found || null;
  },

  async createUserByPhone(data: { fullName: string; phone: string; countryCode: string }) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const created = await UserModel.create({
      fullName: data.fullName,
      phone: data.phone,
      countryCode: data.countryCode,
      name: data.fullName, // Set name same as fullName for compatibility
      isActive: true,
      payment: {
        type: "free",
        startDate: now,
        durationDays: 30,
        expiresAt,
      },
    });

    return created.toObject();
  },

  async saveLoginOtp(phone: string, countryCode: string, otp: string) {
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const updated = await UserModel.findOneAndUpdate(
      { phone, countryCode },
      { loginOtp: otp, loginOtpExpiry: expiry },
      { new: true }
    ).lean();
    return updated;
  },

  async verifyLoginOtp(phone: string, countryCode: string, otp: string): Promise<boolean> {
    const user = await UserModel.findOne({ phone, countryCode }).lean();
    if (!user) return false;
    if (!user.loginOtp || !user.loginOtpExpiry) return false;

    // Check if OTP matches and not expired
    const isValid = user.loginOtp === otp && new Date(user.loginOtpExpiry) > new Date();
    return isValid;
  },

  async clearLoginOtp(phone: string, countryCode: string) {
    await UserModel.findOneAndUpdate(
      { phone, countryCode },
      { $unset: { loginOtp: "", loginOtpExpiry: "" } }
    );
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
};
