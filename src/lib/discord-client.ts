import wretch from "wretch";
import { env } from "@/config/env";

export const sendDiscordMessage = async (message: string) => {
  return wretch(env.DISCORD_WEBHOOK).post({ content: message }).json();
};
