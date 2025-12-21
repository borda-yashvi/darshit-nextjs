import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.post("/", authMiddleware, upload.single("image"), OrderController.create);
router.get("/", authMiddleware, OrderController.list);

router.get("/:id", authMiddleware, OrderController.get);
router.put("/:id", authMiddleware, upload.single("image"), OrderController.update);

// order-table routes
router.post("/:id/rows", authMiddleware, OrderController.addRow);
router.put("/rows/:rowId", authMiddleware, OrderController.updateRow);
router.delete("/rows/:rowId", authMiddleware, OrderController.deleteRow);
router.delete("/:id", authMiddleware, OrderController.delete);

router.get("/saree-pdf/:orderId", authMiddleware, OrderController.getSareePdf);

export default router;
