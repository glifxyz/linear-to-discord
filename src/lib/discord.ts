import wretch from "wretch";
import { env } from "@/config/env";

export const sendMessage = async (message: string) => {
  return wretch(env.DISCORD_WEBHOOK).post({ content: message }).json();
};
