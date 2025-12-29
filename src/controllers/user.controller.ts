import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserService } from "../services/user.service";
import bcrypt from "bcryptjs";
import { successResponse, errorResponse } from "../utils/response.util";


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

      // handle device registration/auto-catchup
      const deviceInfo = {
        deviceId: req.body.deviceId || req.header("x-device-id"),
        type: req.body.deviceType || req.header("x-device-type") || "unknown",
        platform: req.body.platform || req.header("x-device-platform"),
        userAgent: req.header("user-agent") || req.body.userAgent,
        ip: req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress,
        name: req.body.deviceName || req.body.name,
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
};
