import nodemailer from "nodemailer";
import { env } from "../config/env";

export const EmailService = {
    async sendOtpEmail(email: string, otp: string) {
        try {
            // Create transporter
            const transporter = nodemailer.createTransport({
                host: env.emailHost,
                port: env.emailPort,
                secure: env.emailPort === 465, // true for 465, false for other ports
                auth: {
                    user: env.emailUser,
                    pass: env.emailPass,
                },
            });

            // Email content
            const mailOptions = {
                from: env.emailFrom,
                to: email,
                subject: "Password Reset OTP",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Password Reset Request</h2>
                        <p>You have requested to reset your password. Use the following OTP to reset your password:</p>
                        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #4CAF50; letter-spacing: 5px; margin: 0;">${otp}</h1>
                        </div>
                        <p>This OTP will expire in <strong>10 minutes</strong>.</p>
                        <p>If you did not request this password reset, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                        <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
                    </div>
                `,
            };

            // Send email
            const info = await transporter.sendMail(mailOptions);
            console.log("OTP email sent:", info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error: any) {
            console.error("Error sending OTP email:", error);
            throw new Error("Failed to send OTP email: " + error.message);
        }
    },
};
