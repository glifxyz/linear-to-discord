import { createHmac, timingSafeEqual } from "node:crypto";
import wretch from "wretch";
import { z } from "zod";

const envSchema = z.object({
  DISCORD_WEBHOOK: z.url(),
  DISCORD_WEBHOOK_PROJECTS: z.url().optional(),
  LINEAR_WEBHOOK_SECRET: z.string().min(1),
});

// Lazy so tests can import without all env vars set; parsed on first access at runtime.
let cachedEnv: z.infer<typeof envSchema> | undefined;
export const env = (): z.infer<typeof envSchema> => {
  if (!cachedEnv) cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
};

// Lenient on purpose: Linear adds new event types over time, and some events
// (Reaction, OAuthAppRevoked, etc.) omit fields like `url`. We accept anything
// shaped roughly like a Linear webhook and let formatEvent decide.
export const WebhookPayloadSchema = z.object({
  action: z.string(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  url: z.string().optional(),
  updatedFrom: z.record(z.string(), z.unknown()).optional(),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

export const verifyLinearSignature = (
  rawBody: Buffer,
  header: string | string[] | undefined,
  secret: string
): boolean => {
  if (typeof header !== "string" || header.length === 0) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  // timingSafeEqual requires equal-length buffers; bail early.
  if (expected.length !== header.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(header, "hex"));
};

// Discord renders a severed markdown link or bare URL as literal text, so when
// the cut lands inside one, back it up to the start of that token.
const LINKISH = /\[[^\]\n]*\]\([^)\s]*\)|https?:\/\/\S+/g;

const truncate = (s: string, n = 200) => {
  if (s.length <= n) return s;
  let cut = n;
  for (const m of s.matchAll(LINKISH)) {
    if (m.index >= cut) break;
    if (m.index + m[0].length > cut) cut = m.index;
  }
  // The whole allowance is one oversized link — nothing safe to keep.
  return cut === 0 ? "..." : `${s.slice(0, cut).trimEnd()}...`;
};

const link = (text: string | undefined, url: string | undefined) =>
  text && url ? `[${text}](${url})` : (text ?? "");

const blockquote = (s: string) =>
  s
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

const HEALTH_EMOJI: Record<string, string> = {
  onTrack: "🟢",
  atRisk: "🟡",
  offTrack: "🔴",
  completed: "✅",
};

// Returns the Discord message string, or null if the event should be skipped.
// Skipped: noisy events (Reaction, IssueAttachment, IssueLabel, label-only updates),
// Issue updates that don't change state/assignee/title, and any unknown type/action.
export function formatEvent(p: WebhookPayload): string | null {
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous payload shape, validated as a webhook above.
  const d = (p.data ?? {}) as any;
  const url = p.url;

  switch (`${p.type}:${p.action}`) {
    case "Issue:create":
      return `New issue created: ${link(d.title, url)}`;

    case "Issue:update": {
      const changed = p.updatedFrom ?? {};
      const lines: string[] = [];
      if ("stateId" in changed && d.state?.name) {
        lines.push(`Status: → **${d.state.name}**`);
      }
      if ("assigneeId" in changed) {
        lines.push(d.assignee?.name ? `Assignee: → ${d.assignee.name}` : `Unassigned`);
      }
      if ("title" in changed) {
        lines.push(`Title: *${changed.title}* → ${d.title}`);
      }
      if (lines.length === 0) return null;
      return `Issue updated: ${link(d.title, url)}\n${blockquote(lines.join("\n"))}`;
    }

    case "Comment:create": {
      const issueUrl = d.issue?.url ?? url;
      const body = blockquote(truncate(d.body ?? "", 1000));
      return `${d.user?.name} commented on ${link(d.issue?.title, issueUrl)}:\n${body}`;
    }

    case "Project:create":
      return `New project created: ${link(d.name, url)}`;

    case "ProjectUpdate:create": {
      const emoji = HEALTH_EMOJI[d.health];
      const head = `${emoji ? `${emoji} ` : ""}Project update on ${link(d.project?.name, url)} by ${d.user?.name}`;
      return d.body ? `${head}:\n${blockquote(truncate(d.body, 1500))}` : head;
    }

    case "Cycle:create":
      return `New cycle: ${d.team?.name} ${link(d.name, url)}`;

    case "Document:create":
      return `New document: ${link(d.title, url)}`;

    case "Initiative:create":
      return `New initiative: ${link(d.name, url)}`;

    case "InitiativeUpdate:create":
      return `Initiative update on ${d.initiative?.name} by ${d.user?.name}`;

    case "Customer:create":
      return `New customer: ${d.name}${d.email ? ` (${d.email})` : ""}`;

    case "CustomerRequest:create":
      return `New customer request: ${d.title || d.issue?.title} (from ${d.customer?.name})`;

    case "User:create":
      return `New team member: ${d.name} joined`;

    case "IssueSLA:highRisk":
      return `⚠️ SLA at risk: ${link(d.issue?.title, d.issue?.url)}`;
    case "IssueSLA:breached":
      return `🚨 SLA breached: ${link(d.issue?.title, d.issue?.url)}`;

    case "OAuthAppRevoked:remove":
      return `🔐 OAuth app access revoked — check Linear integration settings`;

    default:
      return null;
  }
}

export const isProjectEvent = (p: WebhookPayload): boolean =>
  p.type === "Project" || p.type === "ProjectUpdate";

// Project events go to the main channel *and* the projects channel, so they keep
// their place in the normal feed while also getting extra visibility.
export const sendToDiscord = async (message: string, alsoProjects = false): Promise<void> => {
  const e = env();
  // Discord rejects content over 2000 chars; leave room for the ellipsis.
  const content = truncate(message, 1990);
  const urls = [e.DISCORD_WEBHOOK];
  if (alsoProjects && e.DISCORD_WEBHOOK_PROJECTS) urls.push(e.DISCORD_WEBHOOK_PROJECTS);
  await Promise.all(urls.map((url) => wretch(url).post({ content }).res()));
};
