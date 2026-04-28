import { z } from "zod";

export const env = z
  .object({
    DISCORD_WEBHOOK: z.string().url(),
    DISCORD_WEBHOOK_PROJECTS: z.string().url().optional(),
    LINEAR_WEBHOOK_SECRET: z.string().min(1),
  })
  .parse(process.env);
