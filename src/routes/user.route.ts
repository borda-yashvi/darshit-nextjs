import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.get("/profile", authMiddleware, UserController.profile);

export default router;
