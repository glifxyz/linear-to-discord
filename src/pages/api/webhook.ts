import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "@/config/env";
import { sendDiscordMessage } from "@/lib/discord-client";
import { formatDiscordMessage, parseLinearWebhook, shouldNotifyDiscord } from "@/lib/linear-parser";
import { WebhookPayloadSchema } from "@/lib/linear-types";
import { verifyLinearSignature } from "@/lib/verify-signature";

// Disable Next's automatic body parsing so we can verify the signature against the raw bytes.
export const config = {
  api: { bodyParser: false },
};

const readRawBody = (req: NextApiRequest): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const rawBody = await readRawBody(req);

    if (
      !verifyLinearSignature(rawBody, req.headers["linear-signature"], env.LINEAR_WEBHOOK_SECRET)
    ) {
      console.warn("Rejected webhook: signature mismatch");
      return res.status(401).json({ success: false, error: "Invalid signature" });
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawBody.toString("utf8"));
    } catch (error) {
      console.error("Webhook body is not valid JSON:", error);
      return res.status(400).json({ success: false, error: "Invalid JSON" });
    }

    const validationResult = WebhookPayloadSchema.safeParse(parsedJson);
    if (!validationResult.success) {
      console.error("Invalid webhook payload:", validationResult.error);
      return res.status(400).json({
        success: false,
        error: "Invalid webhook payload",
        details: validationResult.error.flatten(),
      });
    }

    const payload = validationResult.data;
    const parsedEvent = parseLinearWebhook(payload);

    if (!shouldNotifyDiscord(parsedEvent)) {
      console.log("Event ignored:", {
        type: payload.type,
        action: payload.action,
        priority: parsedEvent.priority,
        reason: parsedEvent.message,
      });
      return res.json({
        success: true,
        message: "Event ignored",
        data: { type: payload.type, action: payload.action, priority: parsedEvent.priority },
      });
    }

    const finalMessage = formatDiscordMessage(parsedEvent);

    console.log("Posting message:", {
      type: payload.type,
      action: payload.action,
      priority: parsedEvent.priority,
    });

    const isProjectUpdate = payload.type === "Project" || payload.type === "ProjectUpdate";
    await sendDiscordMessage(finalMessage, isProjectUpdate);

    return res.json({
      success: true,
      data: { type: payload.type, action: payload.action, priority: parsedEvent.priority },
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
