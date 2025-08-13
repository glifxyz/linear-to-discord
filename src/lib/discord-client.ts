import wretch from "wretch";
import { env } from "@/config/env";

export const sendDiscordMessage = async (
  message: string,
  isProjectUpdate: boolean = false
) => {
  // Use project-specific webhook if available and this is a project update
  const webhookUrl =
    isProjectUpdate && env.DISCORD_WEBHOOK_PROJECTS
      ? env.DISCORD_WEBHOOK_PROJECTS
      : env.DISCORD_WEBHOOK;

  return wretch(webhookUrl).post({ content: message }).json();
};
