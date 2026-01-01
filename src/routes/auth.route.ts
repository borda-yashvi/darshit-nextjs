import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const router = Router();

// POST /api/auth/google { idToken }
router.post("/google", AuthController.google);
// POST /api/auth/apple { idToken }
router.post("/apple", AuthController.apple);

export default router;
