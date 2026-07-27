# 🔌 Linear to Discord

A tiny Next.js webhook service that forwards [Linear](https://linear.app/) events to a [Discord](https://discord.com/) channel as one-line messages with clickable links to the Linear issue.

The whole thing is one API route plus one library file (~250 lines of TypeScript). Deployed on Vercel.

## How it works

1. Linear POSTs to `/api/webhook` whenever an event happens (issue created, comment posted, etc.)
2. The handler verifies Linear's HMAC-SHA256 signature against the raw body
3. The event is formatted into a one-liner like `New issue created: [Login broken](https://linear.app/…)`
4. The message is forwarded to your Discord webhook

Unknown event types and noisy ones (reactions, label-only updates, attachments) are silently skipped. `Issue:update` only fires on state, assignee, or title changes.

## Setup

1. Create a Discord webhook in your target channel ([guide](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)).
2. In Linear: Settings → API → Webhooks → create a webhook pointing at `https://<your-deployment>/api/webhook`. Copy the signing secret.
3. Set Vercel env vars (Project → Settings → Environment Variables):
   - `DISCORD_WEBHOOK` — Discord webhook URL **(required)**
   - `LINEAR_WEBHOOK_SECRET` — Linear's signing secret **(required, HMAC verification)**
   - `DISCORD_WEBHOOK_PROJECTS` — optional. When set, `Project` / `ProjectUpdate` events are posted here *in addition to* `DISCORD_WEBHOOK`, for extra visibility in a busier channel.
4. Deploy. Confirm the Linear webhook is **enabled**.

## Development

```sh
pnpm install
pnpm dev          # next dev
pnpm test         # vitest watch
pnpm test:run     # vitest run (CI)
pnpm lint         # biome check --write
pnpm typecheck    # tsc --noEmit
pnpm build        # next build
```

Stack: [Next.js 16](https://nextjs.org/) (Pages Router), [React 19](https://react.dev/), [TypeScript 5.9](https://www.typescriptlang.org/), [Zod 4](https://zod.dev/) for schemas + env validation, [wretch](https://github.com/elbywan/wretch) for HTTP, [vitest](https://vitest.dev/) for tests, [Biome](https://biomejs.dev/) for lint + format. Node 22.14.x, pnpm.

## Layout

```
src/
├── lib/
│   ├── linear.ts         everything: env, schema, HMAC verify, formatter, Discord sender
│   └── linear.test.ts    26 tests
└── pages/
    ├── api/
    │   └── webhook.ts    Next handler
    └── index.tsx         landing one-liner
```

## Logs

Every request logs a structured line to Vercel:

- `Posting: { delivery, type, action, url }` — sent to Discord
- `Skipped: { delivery, type, action, url }` — event ignored (noisy or unknown)
- `Rejected webhook: signature mismatch` — 401
- `Invalid webhook payload` — 400 (rare, schema is lenient)

`delivery` is Linear's `linear-delivery` header — useful for correlating with Linear's webhook log when debugging.

---

Originally forked from [varun-raj/linear-to-discord](https://github.com/varun-raj/linear-to-discord), but has since been largely rewritten.
