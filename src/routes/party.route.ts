import { Router } from "express";
import { PartyController } from "../controllers/party.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { createPartySchema, updatePartySchema } from "../validations/party.validation";

const router = Router();

router.post("/", authMiddleware, validateRequest(createPartySchema, "body"), PartyController.create);
router.get("/", authMiddleware, PartyController.list);
router.get("/:id", authMiddleware, PartyController.get);
router.put("/:id", authMiddleware, validateRequest(updatePartySchema, "body"), PartyController.update);
router.delete("/:id", authMiddleware, PartyController.delete);

export default router;
