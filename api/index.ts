import app from "../src/app";
import { IncomingMessage, ServerResponse } from "http";

// Vercel will call this default export for requests to /api
export default function handler(req: IncomingMessage & { url?: string, method?: string, headers?: any }, res: ServerResponse & { setHeader?: any }) {
    // `app` is an Express app. Express expects `req` and `res` compatible with Node's http objects.
    // We can directly call it.
    // @ts-ignore
    return (app as any)(req, res);
}
