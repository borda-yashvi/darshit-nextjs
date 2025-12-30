import { Router } from "express";
import { PartyController } from "../controllers/party.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, PartyController.create);
router.get("/", authMiddleware, PartyController.list);
router.get("/:id", authMiddleware, PartyController.get);
router.put("/:id", authMiddleware, PartyController.update);
router.delete("/:id", authMiddleware, PartyController.delete);

export default router;
