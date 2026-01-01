import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserService } from "../services/user.service";
import { errorResponse } from "../utils/response.util";

export interface AuthRequest extends Request {
  user?: any;
  get?(name: string): string | undefined;
  header?(name: string): string | undefined;
  ip?: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return errorResponse(res, 401, "Access denied. No token provided.");
  }

  (async () => {
    try {
      const decoded: any = jwt.verify(token, env.jwtSecret);

      if (!decoded || !decoded.id) {
        return errorResponse(res, 401, "Invalid token payload.");
      }

      const user = await UserService.getUser(decoded.id);
      if (!user) return errorResponse(res, 401, "User not found.");

      // check active flag
      if (user.isActive === false) {
        return errorResponse(res, 403, "Account inactive.");
      }

      // check payment expiry
      if (user.payment && (user.payment as any).expiresAt) {
        const expires = new Date((user.payment as any).expiresAt as any).getTime();
        const now = Date.now();
        if (expires <= now) {
          // Optionally mark user inactive
          await UserService.setInactive(String(user._id));
          return errorResponse(res, 402, "Payment expired. Please renew to continue.");
        }
      }

      // Device enforcement: require device id header and ensure device is registered
      const deviceId = (req.get("x-device-id") || req.get("device-id")) || decoded.deviceId;
      // if (!deviceId) {
      //   return errorResponse(res, 400, "Device id required in 'x-device-id' header.");
      // }

      if (deviceId) {
        const foundDevice = (user.devices || []).find((d: any) => d.deviceId === deviceId);
        if (!foundDevice) {
          return errorResponse(res, 401, "Device not registered for this user.");
        }

        // update lastSeen for the device (best-effort)
        try {
          await UserService.upsertDevice(String(user._id), { deviceId, userAgent: req.get("user-agent"), ip: (req as any).ip });
        } catch (err) {
          // ignore update errors
        }
      }

      req.user = { id: decoded.id, email: decoded.email };
      next();
    } catch (err: any) {
      return errorResponse(res, 401, "Invalid or expired token.", { error: err.message });
    }
  })();
};
