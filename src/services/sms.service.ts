import { env } from "../config/env";

export const SmsService = {
    async sendOtpSms(phone: string, countryCode: string, otp: string) {
        try {
            const fullPhone = `${countryCode}${phone}`;

            // Console mode for development/testing
            if (env.smsService === "console") {
                console.log(`=== SMS OTP ===`);
                console.log(`To: ${fullPhone}`);
                console.log(`OTP: ${otp}`);
                console.log(`===============`);
                return { success: true, mode: "console" };
            }

            // TODO: Implement actual SMS providers
            // Twilio integration
            if (env.smsService === "twilio") {
                // const twilio = require("twilio");
                // const client = twilio(env.smsApiKey, env.smsApiSecret);
                // await client.messages.create({
                //     body: `Your OTP is: ${otp}. Valid for 5 minutes.`,
                //     from: env.smsFromNumber,
                //     to: fullPhone
                // });
                throw new Error("Twilio SMS not yet implemented. Please configure.");
            }

            // AWS SNS integration
            if (env.smsService === "aws") {
                // const AWS = require("aws-sdk");
                // const sns = new AWS.SNS();
                // await sns.publish({
                //     Message: `Your OTP is: ${otp}. Valid for 5 minutes.`,
                //     PhoneNumber: fullPhone
                // }).promise();
                throw new Error("AWS SNS not yet implemented. Please configure.");
            }

            return { success: true };
        } catch (error: any) {
            console.error("Error sending OTP SMS:", error);
            throw new Error("Failed to send OTP: " + error.message);
        }
    },
};
