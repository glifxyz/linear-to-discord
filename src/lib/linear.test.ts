import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  formatEvent,
  sendToDiscord,
  verifyLinearSignature,
  type WebhookPayload,
  WebhookPayloadSchema,
} from "./linear";

const sign = (body: Buffer, secret: string) =>
  createHmac("sha256", secret).update(body).digest("hex");

describe("verifyLinearSignature", () => {
  const secret = "test-secret";
  const body = Buffer.from('{"action":"create","type":"Issue"}', "utf8");

  it("accepts a correctly signed body", () => {
    expect(verifyLinearSignature(body, sign(body, secret), secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const signature = sign(body, secret);
    const tampered = Buffer.from('{"action":"create","type":"Comment"}', "utf8");
    expect(verifyLinearSignature(tampered, signature, secret)).toBe(false);
  });

  it("rejects when the secret is wrong", () => {
    expect(verifyLinearSignature(body, sign(body, "other-secret"), secret)).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(verifyLinearSignature(body, undefined, secret)).toBe(false);
  });

  it("rejects an empty header", () => {
    expect(verifyLinearSignature(body, "", secret)).toBe(false);
  });

  it("rejects an array header", () => {
    expect(verifyLinearSignature(body, [sign(body, secret)], secret)).toBe(false);
  });

  it("rejects a header of wrong length without throwing", () => {
    expect(verifyLinearSignature(body, "deadbeef", secret)).toBe(false);
  });
});

const payload = (overrides: Partial<WebhookPayload>): WebhookPayload =>
  WebhookPayloadSchema.parse({
    action: "create",
    type: "Issue",
    url: "https://linear.app/team/issue/ENG-1",
    data: {},
    ...overrides,
  });

const ISSUE_URL = "https://linear.app/team/issue/ENG-42";

const projectUpdateEmbed = (message: ReturnType<typeof formatEvent>) => {
  assert(message !== null && typeof message !== "string");
  const embed = message.embeds[0];
  assert(embed);
  return embed;
};

describe("WebhookPayloadSchema", () => {
  it("accepts payloads with no url (some Linear events omit it)", () => {
    const result = WebhookPayloadSchema.safeParse({
      action: "create",
      type: "Reaction",
      data: {},
    });
    expect(result.success).toBe(true);
  });

  it("accepts unknown event types (Linear adds new ones over time)", () => {
    const result = WebhookPayloadSchema.safeParse({
      action: "create",
      type: "AgentSession",
      data: {},
    });
    expect(result.success).toBe(true);
  });
});

describe("formatEvent", () => {
  it("formats Issue create as a one-liner with a link", () => {
    expect(
      formatEvent(
        payload({
          type: "Issue",
          action: "create",
          url: ISSUE_URL,
          data: { title: "Login broken" },
        })
      )
    ).toBe(`New issue created: [Login broken](${ISSUE_URL})`);
  });

  it("posts on state change and includes the new state", () => {
    expect(
      formatEvent(
        payload({
          type: "Issue",
          action: "update",
          url: ISSUE_URL,
          data: { title: "Login broken", state: { name: "Done" } },
          updatedFrom: { stateId: "old-state-id" },
        })
      )
    ).toBe(`Issue updated: [Login broken](${ISSUE_URL})\n> Status: → **Done**`);
  });

  it("posts on assignee change with the new assignee", () => {
    expect(
      formatEvent(
        payload({
          type: "Issue",
          action: "update",
          url: ISSUE_URL,
          data: { title: "Login broken", assignee: { name: "Alice" } },
          updatedFrom: { assigneeId: null },
        })
      )
    ).toBe(`Issue updated: [Login broken](${ISSUE_URL})\n> Assignee: → Alice`);
  });

  it("posts on unassign", () => {
    expect(
      formatEvent(
        payload({
          type: "Issue",
          action: "update",
          url: ISSUE_URL,
          data: { title: "Login broken" },
          updatedFrom: { assigneeId: "prev-user-id" },
        })
      )
    ).toBe(`Issue updated: [Login broken](${ISSUE_URL})\n> Unassigned`);
  });

  it("posts on title change with the previous title", () => {
    expect(
      formatEvent(
        payload({
          type: "Issue",
          action: "update",
          url: ISSUE_URL,
          data: { title: "New title" },
          updatedFrom: { title: "Old title" },
        })
      )
    ).toBe(`Issue updated: [New title](${ISSUE_URL})\n> Title: *Old title* → New title`);
  });

  it("combines multiple field changes from one webhook into a single message", () => {
    const msg = formatEvent(
      payload({
        type: "Issue",
        action: "update",
        url: ISSUE_URL,
        data: {
          title: "New title",
          state: { name: "In Progress" },
          assignee: { name: "Bob" },
        },
        updatedFrom: {
          stateId: "old-state-id",
          assigneeId: "old-user-id",
          title: "Old title",
        },
      })
    );
    expect(msg).toBe(
      `Issue updated: [New title](${ISSUE_URL})\n` +
        `> Status: → **In Progress**\n` +
        `> Assignee: → Bob\n` +
        `> Title: *Old title* → New title`
    );
  });

  it("skips Issue updates that don't touch state/assignee/title", () => {
    expect(
      formatEvent(
        payload({
          type: "Issue",
          action: "update",
          url: ISSUE_URL,
          data: { title: "x" },
          updatedFrom: { labelIds: ["a", "b"] },
        })
      )
    ).toBeNull();
  });

  it("skips Issue updates with no updatedFrom (no-op update)", () => {
    expect(
      formatEvent(
        payload({ type: "Issue", action: "update", url: ISSUE_URL, data: { title: "x" } })
      )
    ).toBeNull();
  });

  it("formats Comment create with author, link, and blockquote body", () => {
    const msg = formatEvent(
      payload({
        type: "Comment",
        action: "create",
        url: "https://linear.app/team/issue/ENG-1#comment-1",
        data: {
          body: "merging now\nlooks good",
          user: { name: "Jamie Wilkinson" },
          issue: { title: "Login broken", url: ISSUE_URL },
        },
      })
    );
    expect(msg).toBe(
      `Jamie Wilkinson commented on [Login broken](${ISSUE_URL}):\n> merging now\n> looks good`
    );
  });

  it("truncates long comment bodies", () => {
    const msg = formatEvent(
      payload({
        type: "Comment",
        action: "create",
        data: {
          body: "a".repeat(2000),
          user: { name: "Alice" },
          issue: { title: "x", url: ISSUE_URL },
        },
      })
    );
    expect(msg).toContain("...");
    expect(msg).not.toContain("a".repeat(2000));
  });

  it("formats Project create as a one-liner", () => {
    const projectUrl = "https://linear.app/team/project/q3-launch";
    expect(
      formatEvent(
        payload({ type: "Project", action: "create", url: projectUrl, data: { name: "Q3 Launch" } })
      )
    ).toBe(`New project created: [Q3 Launch](${projectUrl})`);
  });

  it("formats ProjectUpdate create as a linked, health-colored embed", () => {
    const msg = formatEvent(
      payload({
        type: "ProjectUpdate",
        action: "create",
        url: "https://linear.app/team/project/q3-launch/update/123",
        data: {
          project: { name: "Q3 Launch" },
          user: { name: "Carol" },
          health: "atRisk",
          body: "Slipping by a week.",
          createdAt: "2026-08-12T12:34:56.000Z",
        },
      })
    );
    expect(projectUpdateEmbed(msg)).toEqual({
      title: "Q3 Launch",
      url: "https://linear.app/team/project/q3-launch/update/123",
      description: "Slipping by a week.",
      color: 0xfee75c,
      author: { name: "Carol" },
      footer: { text: "At risk" },
      timestamp: "2026-08-12T12:34:56.000Z",
    });
  });

  it("normalizes Linear's angle-wrapped links for Discord embed markdown", () => {
    const notionUrl = "https://app.notion.com/p/glifxyz/Sindy-De-Vries-123";
    const githubUrl = "https://github.com/glifxyz/marketing";
    const msg = formatEvent(
      payload({
        type: "ProjectUpdate",
        action: "create",
        data: {
          project: { name: "Outbound" },
          user: { name: "Lamia" },
          health: "onTrack",
          body: `Sindy: [${notionUrl}](<${notionUrl}>)\n[Marketing repo](<${githubUrl}>)`,
        },
      })
    );

    expect(projectUpdateEmbed(msg).description).toBe(
      `Sindy: [app.notion.com/…](${notionUrl})\n[Marketing repo](${githubUrl})`
    );
  });

  // Regression: a blind slice used to sever links mid-URL, e.g.
  // "[MCP Public Launch](https://line..." which Discord renders as literal text.
  it("never cuts a markdown link in half when truncating", () => {
    const link = "[MCP Public Launch](https://linear.app/glif/project/mcp-public-launch-abc123)";
    const msg = formatEvent(
      payload({
        type: "ProjectUpdate",
        action: "create",
        data: {
          project: { name: "Q3 Launch" },
          user: { name: "Carol" },
          health: "onTrack",
          body: `${"a".repeat(3980)} ${link} trailing text`,
        },
      })
    );
    const description = projectUpdateEmbed(msg).description ?? "";
    // Either the link survives whole or it's dropped whole — never a fragment.
    expect(description.includes("[MCP Public Launch]")).toBe(description.includes(link));
  });

  it("keeps a bare URL intact when truncating", () => {
    const url = "https://github.com/glifxyz/marketing/blob/main/README.md#getting-started";
    const msg = formatEvent(
      payload({
        type: "Comment",
        action: "create",
        data: {
          body: `${"a".repeat(980)} ${url} more`,
          user: { name: "Alice" },
          issue: { title: "x", url: ISSUE_URL },
        },
      })
    );
    assert(typeof msg === "string");
    expect(msg.includes("https://github.com")).toBe(msg.includes(url));
  });

  it("keeps long project update bodies that fit under the limit whole", () => {
    const body = `${"word ".repeat(700)}[link](https://linear.app/x)`;
    const msg = formatEvent(
      payload({
        type: "ProjectUpdate",
        action: "create",
        data: {
          project: { name: "Q3 Launch" },
          user: { name: "Carol" },
          health: "onTrack",
          body,
        },
      })
    );
    const description = projectUpdateEmbed(msg).description ?? "";
    expect(description).toContain("[link](https://linear.app/x)");
    expect(description).not.toContain("...");
  });

  it("formats SLA breached with the issue link", () => {
    const msg = formatEvent(
      payload({
        type: "IssueSLA",
        action: "breached",
        data: { issue: { title: "Login broken", url: ISSUE_URL } },
      })
    );
    expect(msg).toBe(`🚨 SLA breached: [Login broken](${ISSUE_URL})`);
  });

  it("formats OAuthAppRevoked", () => {
    const msg = formatEvent(payload({ type: "OAuthAppRevoked", action: "remove", data: {} }));
    expect(msg).toContain("OAuth");
  });

  it("returns null for Reaction events", () => {
    expect(formatEvent(payload({ type: "Reaction", action: "create", data: {} }))).toBeNull();
  });

  it("returns null for IssueAttachment events (too noisy)", () => {
    expect(
      formatEvent(payload({ type: "IssueAttachment", action: "create", data: {} }))
    ).toBeNull();
  });

  it("returns null for unknown event types instead of crashing", () => {
    expect(formatEvent(payload({ type: "AgentSession", action: "create", data: {} }))).toBeNull();
  });

  it("returns null for Project:update (too generic to be useful)", () => {
    expect(
      formatEvent(payload({ type: "Project", action: "update", data: { name: "x" } }))
    ).toBeNull();
  });
});

describe("sendToDiscord", () => {
  // A real local server rather than a fetch mock, so we exercise the actual POSTs.
  const received: Array<{ path: string; content?: string; embeds?: unknown[] }> = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.from(c)));
    req.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString());
      received.push({
        path: req.url ?? "",
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.embeds !== undefined ? { embeds: body.embeds } : {}),
      });
      res.writeHead(204).end();
    });
  });

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    assert(addr !== null && typeof addr === "object");
    process.env.DISCORD_WEBHOOK = `http://127.0.0.1:${addr.port}/main`;
    process.env.DISCORD_WEBHOOK_PROJECTS = `http://127.0.0.1:${addr.port}/projects`;
    process.env.LINEAR_WEBHOOK_SECRET = "test-secret";
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("posts non-project events to the main webhook only", async () => {
    received.length = 0;
    await sendToDiscord("an issue changed");
    expect(received).toEqual([{ path: "/main", content: "an issue changed" }]);
  });

  it("posts project events to both webhooks", async () => {
    received.length = 0;
    const embeds = [{ title: "Q3 Launch", description: "A [link](https://example.com)" }];
    await sendToDiscord({ embeds }, true);
    expect(received.map((r) => r.path).sort()).toEqual(["/main", "/projects"]);
    expect(received.every((r) => JSON.stringify(r.embeds) === JSON.stringify(embeds))).toBe(true);
  });

  it("clamps content to Discord's message limit", async () => {
    received.length = 0;
    await sendToDiscord("x".repeat(3000));
    const content = received[0]?.content;
    assert(content);
    expect(content.length).toBeLessThanOrEqual(2000);
  });
});
