import type { NextApiRequest, NextApiResponse } from "next";
import {
  env,
  formatEvent,
  isProjectEvent,
  sendToDiscord,
  verifyLinearSignature,
  WebhookPayloadSchema,
} from "@/lib/linear";

// Need raw body bytes for HMAC verification.
export const config = { api: { bodyParser: false } };

const readRawBody = (req: NextApiRequest): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const headerValue = (h: string | string[] | undefined): string | undefined =>
  Array.isArray(h) ? h[0] : h;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const delivery = headerValue(req.headers["linear-delivery"]);

  try {
    const rawBody = await readRawBody(req);

    if (
      !verifyLinearSignature(rawBody, req.headers["linear-signature"], env().LINEAR_WEBHOOK_SECRET)
    ) {
      console.warn("Rejected webhook: signature mismatch", { delivery });
      return res.status(401).json({ ok: false, error: "Invalid signature" });
    }

    const parsed = WebhookPayloadSchema.safeParse(JSON.parse(rawBody.toString("utf8")));
    if (!parsed.success) {
      console.error("Invalid webhook payload:", { delivery, error: parsed.error });
      return res.status(400).json({ ok: false, error: "Invalid payload" });
    }

    const payload = parsed.data;
    const ctx = { delivery, type: payload.type, action: payload.action, url: payload.url };
    const message = formatEvent(payload);

    if (!message) {
      console.log("Skipped:", ctx);
      return res.json({ ok: true, skipped: true });
    }

    const projects = isProjectEvent(payload);
    const length = typeof message === "string" ? message.length : JSON.stringify(message).length;
    console.log("Posting:", { ...ctx, projects, length, message });
    await sendToDiscord(message, projects);

    return res.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", { delivery, error });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
