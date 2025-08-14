import { z } from "zod";

export const env = z
  .object({
    DISCORD_WEBHOOK: z.string().url(),
    DISCORD_WEBHOOK_PROJECTS: z.string().url().optional(),
  })
  .parse(process.env);
