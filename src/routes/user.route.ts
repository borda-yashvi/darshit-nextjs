import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
    updateProfileMobileSchema,
    deleteProfileSchema,
    signupSchema,
    sendOtpSchema,
    verifyOtpSchema,
    resendOtpSchema,
    updateProfileSchema
} from "../validations/user.validation";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post("/register", validateRequest(registerSchema, "body"), UserController.register);
router.post("/login", validateRequest(loginSchema, "body"), UserController.login);
router.get("/profile", authMiddleware, UserController.profile);

// Password management routes
router.post("/forgot-password", validateRequest(forgotPasswordSchema, "body"), UserController.forgotPassword);
router.post("/reset-password", validateRequest(resetPasswordSchema, "body"), UserController.resetPassword);
router.post("/change-password", authMiddleware, validateRequest(changePasswordSchema, "body"), UserController.changePassword);

// Mobile OTP authentication routes
router.post("/signup", validateRequest(signupSchema, "body"), UserController.signup);
router.post("/send-otp", validateRequest(sendOtpSchema, "body"), UserController.sendOtp);
router.post("/verify-otp", validateRequest(verifyOtpSchema, "body"), UserController.verifyOtp);
router.post("/resend-otp", validateRequest(resendOtpSchema, "body"), UserController.resendOtp);
router.put("/profile-mobile", authMiddleware, upload.single("image"), validateRequest(updateProfileMobileSchema, "body"), UserController.updateProfileMobile);

router.post("/logout", UserController.logout);
router.delete("/profile", validateRequest(deleteProfileSchema, "body"), UserController.deleteProfile);

export default router;
