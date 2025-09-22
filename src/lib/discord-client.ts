import wretch from "wretch";
import { env } from "@/config/env";
import { z } from "zod";

// Discord webhook response schema for type safety
const DiscordWebhookResponseSchema = z.object({
  id: z.string().optional(),
  type: z.number().optional(),
  content: z.string().optional(),
  channel_id: z.string().optional(),
  author: z
    .object({
      id: z.string(),
      username: z.string(),
      avatar: z.string().nullable().optional(),
    })
    .optional(),
  timestamp: z.string().optional(),
});

export type DiscordWebhookResponse = z.infer<
  typeof DiscordWebhookResponseSchema
>;

export const sendDiscordMessage = async (
  message: string,
  isProjectUpdate: boolean = false
): Promise<DiscordWebhookResponse> => {
  // Use project-specific webhook if available and this is a project update
  const webhookUrl =
    isProjectUpdate && env.DISCORD_WEBHOOK_PROJECTS
      ? env.DISCORD_WEBHOOK_PROJECTS
      : env.DISCORD_WEBHOOK;

  try {
    const response = await wretch(webhookUrl)
      .post({ content: message })
      .json<unknown>();

    // Validate the response
    const validatedResponse = DiscordWebhookResponseSchema.parse(response);
    return validatedResponse;
  } catch (error) {
    // Log the error for debugging
    console.error("Discord webhook error:", error);

    // Re-throw with more context
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid Discord response: ${error.message}`);
    }

    throw new Error(
      `Failed to send Discord message: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};
