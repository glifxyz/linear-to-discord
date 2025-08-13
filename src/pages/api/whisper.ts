import type { NextApiRequest, NextApiResponse } from "next";
import { sendMessage } from "@/lib/discord";
import {
  parseWebhookEvent,
  shouldSendEvent,
  formatFinalMessage,
} from "@/lib/webhook-handler";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const payload = req.body;

  // Parse the webhook event
  const parsedEvent = parseWebhookEvent(payload);

  // Check if we should send this event
  if (!shouldSendEvent(parsedEvent)) {
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
  const finalMessage = formatFinalMessage(parsedEvent);

  console.log("Posting message:", {
    type: payload.type,
    action: payload.action,
    priority: parsedEvent.priority,
    message: finalMessage,
  });

  // Send to Discord
  await sendMessage(finalMessage);

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
