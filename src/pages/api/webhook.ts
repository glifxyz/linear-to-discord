import type { NextApiRequest, NextApiResponse } from "next";
import { sendDiscordMessage } from "@/lib/discord-client";
import {
  parseLinearWebhook,
  shouldNotifyDiscord,
  formatDiscordMessage,
} from "@/lib/linear-parser";
import { WebhookPayloadSchema } from "@/lib/linear-types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Validate the webhook payload
    const validationResult = WebhookPayloadSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.error("Invalid webhook payload:", validationResult.error);
      return res.status(400).json({
        success: false,
        error: "Invalid webhook payload",
        details: validationResult.error.flatten(),
      });
    }

    const payload = validationResult.data;

    // Parse the webhook event
    const parsedEvent = parseLinearWebhook(payload);

    // Check if we should send this event
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
        data: {
          type: payload.type,
          action: payload.action,
          priority: parsedEvent.priority,
        },
      });
    }

    // Get the final formatted message
    const finalMessage = formatDiscordMessage(parsedEvent);

    console.log("Posting message:", {
      type: payload.type,
      action: payload.action,
      priority: parsedEvent.priority,
      message: finalMessage,
    });

    // Check if this is a project-related update
    const isProjectUpdate =
      payload.type === "Project" || payload.type === "ProjectUpdate";

    // Send to Discord
    await sendDiscordMessage(finalMessage, isProjectUpdate);

    return res.json({
      success: true,
      message: "Event processed successfully",
      data: {
        type: payload.type,
        action: payload.action,
        priority: parsedEvent.priority,
      },
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
