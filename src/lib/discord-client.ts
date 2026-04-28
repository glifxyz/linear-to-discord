import wretch from "wretch";
import { env } from "@/config/env";

export const sendDiscordMessage = async (
  message: string,
  isProjectUpdate: boolean = false
): Promise<void> => {
  const webhookUrl =
    isProjectUpdate && env.DISCORD_WEBHOOK_PROJECTS
      ? env.DISCORD_WEBHOOK_PROJECTS
      : env.DISCORD_WEBHOOK;

  await wretch(webhookUrl).post({ content: message }).res();
};
