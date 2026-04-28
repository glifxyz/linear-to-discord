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

export const WebhookPayloadSchema = z.object({
  action: z.enum(["create", "update", "remove", "set", "highRisk", "breached"]),
  type: z.enum([
    "Issue",
    "Comment",
    "Project",
    "ProjectUpdate",
    "IssueAttachment",
    "IssueLabel",
    "Reaction",
    "Document",
    "Initiative",
    "InitiativeUpdate",
    "Cycle",
    "Customer",
    "CustomerRequest",
    "User",
    "IssueSLA",
    "OAuthAppRevoked",
  ]),
  createdAt: z.string(),
  data: z.record(z.string(), z.unknown()),
  url: z.string(),
  organizationId: z.string(),
  webhookTimestamp: z.number(),
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

const truncate = (s: string, n = 200) => (s.length <= n ? s : `${s.slice(0, n)}...`);

const PRIORITY_NAME: Record<number, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

const HEALTH_EMOJI: Record<string, string> = {
  onTrack: "🟢",
  atRisk: "🟡",
  offTrack: "🔴",
  completed: "✅",
};

// Returns the Discord message string, or null if the event should be skipped.
// Skipped: Reaction, IssueAttachment, IssueLabel (too noisy), and any unknown type/action combo.
export function formatEvent(p: WebhookPayload): string | null {
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous payload shape, validated by Zod above.
  const d = p.data as any;
  const key = `${p.type}:${p.action}`;

  switch (key) {
    case "Issue:create": {
      const id = `${d.team?.key}-${d.number ?? 0}`;
      return [
        `🆕 **New Issue Created**`,
        `**${id}**: ${d.title}`,
        `**Priority**: ${PRIORITY_NAME[d.priority] ?? "Unknown"}`,
        `**Assignee**: ${d.assignee?.name ?? "Unassigned"}`,
        `**Creator**: ${d.creator?.name}`,
      ].join("\n");
    }
    case "Issue:update": {
      const id = `${d.team?.key}-${d.number ?? 0}`;
      return [
        `📝 **Issue Updated**`,
        `**${id}**: ${d.title}`,
        `**Status**: ${d.state?.name}`,
        `**Assignee**: ${d.assignee?.name ?? "Unassigned"}`,
      ].join("\n");
    }

    case "Comment:create":
      return [
        `💬 **New Comment**`,
        `**Issue**: ${d.issue?.title}`,
        `**Author**: ${d.user?.name}`,
        `**Comment**: ${truncate(d.body ?? "")}`,
      ].join("\n");

    case "Project:create": {
      const lines = [`📊 **New Project Created:** ${d.name}`];
      if (d.lead?.name) lines.push(`**Lead:** ${d.lead.name}`);
      if (d.description) lines.push(`**Description:** ${truncate(d.description, 100)}`);
      return lines.join("\n");
    }
    case "Project:update":
      return `📊 **Project Updated:** ${d.name}`;

    case "ProjectUpdate:create": {
      const emoji = HEALTH_EMOJI[d.health] ?? "⚪";
      const lines = [
        `${emoji} **Project Update:** ${d.project?.name}`,
        `**Author:** ${d.user?.name}`,
        `**Status:** ${d.health}`,
      ];
      if (d.body) lines.push(`**Update:** ${truncate(d.body.replace(/\n/g, " ").trim())}`);
      return lines.join("\n");
    }
    case "ProjectUpdate:update": {
      const emoji = HEALTH_EMOJI[d.health] ?? "⚪";
      return `${emoji} **Project Update Modified:** ${d.project?.name} by ${d.user?.name}`;
    }

    case "Cycle:create":
      return `🔄 **New Cycle Created:** ${d.team?.name} - ${d.name} (${d.number})`;
    case "Cycle:update":
      return `🔄 **Cycle Updated:** ${d.team?.name} - ${d.name}`;

    case "Document:create":
      return `📄 **New Document:** ${d.title}\n**Project:** ${d.project?.name ?? "None"}\n**Creator:** ${d.creator?.name}`;

    case "Initiative:create":
      return `🎯 **New Initiative:** ${d.name}${d.description ? `\n${truncate(d.description, 100)}` : ""}`;

    case "InitiativeUpdate:create":
      return `🎯 **Initiative Update:** ${d.initiative?.name}\n**Author:** ${d.user?.name}${d.body ? `\n${truncate(d.body)}` : ""}`;

    case "Customer:create":
      return `👤 **New Customer:** ${d.name} (${d.email})`;

    case "CustomerRequest:create":
      return `📮 **Customer Request:** ${d.title || d.issue?.title}\n**Customer:** ${d.customer?.name}\n**Issue:** ${d.issue?.title}`;

    case "User:create":
      return `👋 **New Team Member:** ${d.name} joined the workspace`;

    case "IssueSLA:set":
      return `⏰ **SLA Set:** ${d.issue?.title}\n**Breaches at:** ${d.breachesAt}`;
    case "IssueSLA:highRisk":
      return `⚠️ **SLA High Risk:** ${d.issue?.title} is at risk of breaching SLA`;
    case "IssueSLA:breached":
      return `🚨 **SLA BREACHED:** ${d.issue?.title} has breached its SLA`;

    case "OAuthAppRevoked:remove":
      return `🔐 **OAuth App Access Revoked** - Please check your Linear integration settings`;

    default:
      return null;
  }
}

export const isProjectEvent = (p: WebhookPayload): boolean =>
  p.type === "Project" || p.type === "ProjectUpdate";

export const sendToDiscord = async (message: string, useProjectsWebhook = false): Promise<void> => {
  const e = env();
  const url =
    useProjectsWebhook && e.DISCORD_WEBHOOK_PROJECTS
      ? e.DISCORD_WEBHOOK_PROJECTS
      : e.DISCORD_WEBHOOK;
  await wretch(url).post({ content: message }).res();
};
