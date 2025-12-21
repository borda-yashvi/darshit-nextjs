import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

if (env && process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
} else if (env) {
    // If CLOUDINARY_URL is not provided, user can provide parts (optional)
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env as any;
    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
        cloudinary.config({
            cloud_name: CLOUDINARY_CLOUD_NAME,
            api_key: CLOUDINARY_API_KEY,
            api_secret: CLOUDINARY_API_SECRET,
            secure: true
        });
    }
}

export async function uploadImage(image: string, opts = {}) {
    // image can be a remote URL or base64 data URL
    return cloudinary.uploader.upload(image, opts);
}

export default cloudinary;

export async function deleteImage(publicId: string) {
    if (!publicId) return null;
    return cloudinary.uploader.destroy(publicId);
}
