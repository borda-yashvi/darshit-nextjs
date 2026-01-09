import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.get("/profile", authMiddleware, UserController.profile);

// Password management routes
router.post("/forgot-password", UserController.forgotPassword);
router.post("/reset-password", UserController.resetPassword);
router.post("/change-password", authMiddleware, UserController.changePassword);

// Mobile OTP authentication routes
router.post("/signup", UserController.signup);
router.post("/send-otp", UserController.sendOtp);
router.post("/verify-otp", UserController.verifyOtp);
router.post("/resend-otp", UserController.resendOtp);
router.put("/profile-mobile", authMiddleware, upload.single("image"), UserController.updateProfileMobile);

router.post("/logout", UserController.logout);
router.delete("/profile", UserController.deleteProfile);

export default router;
