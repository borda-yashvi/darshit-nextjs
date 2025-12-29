import { Response } from "express";

/**
 * Standard HTTP status messages
 */
const HTTP_STATUS_MESSAGES: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
    502: "Bad Gateway",
};

/**
 * Success response with standardized format
 */
export const successResponse = (res: Response, data: any, statusCode: number = 200) => {
    return res.status(statusCode).json({
        status: "success",
        statusCode,
        message: "SUCCESS",
        ...data,
    });
};

/**
 * Error response with standardized format
 */
export const errorResponse = (
    res: Response,
    statusCode: number,
    customMessage?: string,
    additionalData?: any
) => {
    const message = customMessage || HTTP_STATUS_MESSAGES[statusCode] || "Error";

    return res.status(statusCode).json({
        status: "error",
        statusCode,
        message,
        ...additionalData,
    });
};
