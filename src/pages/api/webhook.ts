import type { NextApiRequest, NextApiResponse } from "next";
import { sendDiscordMessage } from "@/lib/discord-client";
import {
  parseLinearWebhook,
  shouldNotifyDiscord,
  formatDiscordMessage,
} from "@/lib/linear-parser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const payload = req.body;

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
}
