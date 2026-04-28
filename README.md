# 🔌 Linear to Discord

A small webhook service that forwards Linear events to Discord.

## Setup

1. Create a Discord webhook in your target channel ([guide](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)).
2. In Linear: Settings → API → Webhooks, create a webhook pointing at `https://<your-deployment>/api/webhook`. Copy the signing secret.
3. Set Vercel env vars:
   - `DISCORD_WEBHOOK` — Discord webhook URL (required)
   - `LINEAR_WEBHOOK_SECRET` — Linear's signing secret (required, used for HMAC verification)
   - `DISCORD_WEBHOOK_PROJECTS` — optional, separate webhook for `Project` / `ProjectUpdate` events
4. Deploy. Confirm the Linear webhook is **enabled**.

## Development

```sh
pnpm install
pnpm dev          # next dev
pnpm test         # vitest watch
pnpm test:run     # vitest run
pnpm lint         # biome check --write
pnpm typecheck    # tsc --noEmit
```

Node 22.14.x, pnpm. Linting/formatting via [Biome](https://biomejs.dev/).
