import { z } from "zod";

export const env = z
  .object({
    DISCORD_WEBHOOK: z.url(),
    DISCORD_WEBHOOK_PROJECTS: z.url().optional(),
    LINEAR_WEBHOOK_SECRET: z.string().min(1),
  })
  .parse(process.env);
