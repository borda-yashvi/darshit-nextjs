import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { errorResponse } from "../utils/response.util";

/**
 * Validation middleware that validates request data against a Zod schema
 * Can validate body, query, params, or all combined
 */
export const validateRequest = (schema: ZodSchema, source: "body" | "query" | "params" | "all" = "body") => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            let dataToValidate: any;

            if (source === "all") {
                dataToValidate = {
                    body: req.body,
                    query: req.query,
                    params: req.params,
                };
            } else {
                dataToValidate = req[source as keyof Request];
            }

            // Check if data is undefined or empty
            if (!dataToValidate || (typeof dataToValidate === "object" && Object.keys(dataToValidate).length === 0)) {
                return errorResponse(res, 400, "Validation failed", {
                    errors: [{
                        field: source,
                        message: `Request ${source} is empty or missing. Ensure you're sending JSON with Content-Type: application/json header`,
                    }]
                });
            }

            const result = schema.safeParse(dataToValidate);

            if (!result.success) {
                const errors = result.error.issues.map((err) => ({
                    field: err.path.length > 0 ? err.path.join(".") : source,
                    message: err.message,
                }));
                return errorResponse(res, 400, "Validation failed", { errors });
            }

            // Optionally, attach validated data to request
            if (source === "body") {
                req.body = result.data;
            } else if (source === "query") {
                (req as any).query = result.data;
            } else if (source === "params") {
                (req as any).params = result.data;
            }

            next();
        } catch (error: any) {
            return errorResponse(res, 500, "Validation error", { error: error.message });
        }
    };
};
