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
};
