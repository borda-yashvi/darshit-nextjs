import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserService } from "../services/user.service";
import { successResponse, errorResponse } from "../utils/response.util";

export const AuthController = {
  async google(req: Request, res: Response) {
    try {
      const { idToken } = req.body;
      if (!idToken) return errorResponse(res, 400, "Missing idToken");

      const user = await UserService.loginWithGoogle(idToken);

      const token = jwt.sign({ id: (user as any)._id, email: (user as any).email }, env.jwtSecret, { expiresIn: "30d" });

      return successResponse(res, { user: { ...user, token } });
    } catch (err: any) {
      return errorResponse(res, 500, "Internal Server Error", { error: err.message });
    }
  },

  async apple(req: Request, res: Response) {
    try {
      const { idToken } = req.body;
      if (!idToken) return errorResponse(res, 400, "Missing idToken");

      const user = await UserService.loginWithApple(idToken);

      const token = jwt.sign({ id: (user as any)._id, email: (user as any).email }, env.jwtSecret, { expiresIn: "30d" });

      return successResponse(res, { user: { ...user, token } });
    } catch (err: any) {
      return errorResponse(res, 500, "Internal Server Error", { error: err.message });
    }
  },
};
