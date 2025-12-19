import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserService } from "../services/user.service";

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  (async () => {
    try {
      const decoded: any = jwt.verify(token, env.jwtSecret);

      if (!decoded || !decoded.id) {
        return res.status(401).json({ message: "Invalid token payload." });
      }

      const user = await UserService.getUser(decoded.id);
      if (!user) return res.status(401).json({ message: "User not found." });

      // check active flag
      if (user.isActive === false) {
        return res.status(403).json({ message: "Account inactive." });
      }

      // check payment expiry
      if (user.payment && user.payment.expiresAt) {
        const expires = new Date(user.payment.expiresAt as any).getTime();
        const now = Date.now();
        if (expires <= now) {
          // Optionally mark user inactive
          await UserService.setInactive(user._id);
          return res.status(402).json({ message: "Payment expired. Please renew to continue." });
        }
      }

      // Device enforcement: require device id header and ensure device is registered
      const deviceId = (req.header("x-device-id") || req.header("device-id"));
      if (!deviceId) {
        return res.status(400).json({ message: "Device id required in 'x-device-id' header." });
      }

      const foundDevice = (user.devices || []).find((d: any) => d.deviceId === deviceId);
      if (!foundDevice) {
        return res.status(401).json({ message: "Device not registered for this user." });
      }

      // update lastSeen for the device (best-effort)
      try {
        await UserService.upsertDevice(user._id, { deviceId, userAgent: req.header("user-agent"), ip: req.ip });
      } catch (err) {
        // ignore update errors
      }

      req.user = { id: decoded.id, email: decoded.email };
      next();
    } catch (err: any) {
      return res.status(401).json({ message: "Invalid or expired token.", error: err.message });
    }
  })();
};
