import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserService } from "../services/user.service";

export class UserController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name = '', mobile = '', age = '' } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Create user + profile
      const userProfile = await UserService.createUser({
        email, password,
        name,
        mobile,
        age,
      });

      // Create JWT token
      const token = jwt.sign(
        { email: userProfile.email },
        env.jwtSecret,
        { expiresIn: "1d" }
      );

      res.json({
        message: "User created successfully",
        user: userProfile,
        token,
      });

    } catch (error: any) {
      res.status(500).json({ error: error });
    }
  }

  static async profile(req: Request & { user?: any }, res: Response) {
    try {
      const user = await UserService.getUser(req.user.id);

      res.json({ user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
