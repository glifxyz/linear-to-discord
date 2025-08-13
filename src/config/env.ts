import { z } from "zod";

export const env = z
  .object({
    DISCORD_WEBHOOK: z.string().url(),
  })
  .parse(process.env);
