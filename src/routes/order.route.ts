import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { createOrderWithRowsSchema, updateOrderSchema, updateOrderWithRowsSchema, reorderRowsSchema } from "../validations/order.validation";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.post("/", authMiddleware, upload.single("image"), validateRequest(createOrderWithRowsSchema, "body"), OrderController.create);
router.get("/", authMiddleware, OrderController.list);

router.get("/:id", authMiddleware, OrderController.get);
router.put("/:id", authMiddleware, upload.single("image"), validateRequest(updateOrderSchema, "body"), OrderController.update);
router.put("/:id/with-rows", authMiddleware, upload.single("image"), validateRequest(updateOrderWithRowsSchema, "body"), OrderController.updateWithRows);

// order-table routes
router.post("/:id/rows", authMiddleware, OrderController.addRow);
router.post("/:id/reorder", authMiddleware, validateRequest(reorderRowsSchema, "body"), OrderController.reorderRows);
router.put("/rows/:rowId", authMiddleware, OrderController.updateRow);
router.delete("/rows/:rowId", authMiddleware, OrderController.deleteRow);
router.delete("/:id", authMiddleware, OrderController.delete);

router.get("/saree-pdf/:orderId", authMiddleware, OrderController.getSareePdf);

export default router;
