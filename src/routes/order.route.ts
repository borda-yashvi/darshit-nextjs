import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, OrderController.create);
router.get("/", authMiddleware, OrderController.list);

export default router;
