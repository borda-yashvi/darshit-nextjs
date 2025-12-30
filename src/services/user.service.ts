import UserModel from "../models/user.model";
import { User } from "../types/user.type";

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
      email: `${data.phone}@phone.user`, // Temporary email for compatibility
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
