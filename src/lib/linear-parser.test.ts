import { describe, expect, it } from "vitest";
import { formatDiscordMessage, parseLinearWebhook, shouldNotifyDiscord } from "./linear-parser";
import { EventPriority, type WebhookPayload } from "./linear-types";

const basePayload = (overrides: Partial<WebhookPayload>): unknown => ({
  action: "create",
  type: "Issue",
  createdAt: "2026-04-28T00:00:00.000Z",
  url: "https://linear.app/team/issue/ENG-1",
  organizationId: "org-1",
  webhookTimestamp: 1745798400000,
  data: {},
  ...overrides,
});

describe("parseLinearWebhook", () => {
  it("formats an Issue create with priority and assignee", () => {
    const event = parseLinearWebhook(
      basePayload({
        type: "Issue",
        action: "create",
        data: {
          title: "Login broken",
          number: 42,
          team: { key: "ENG" },
          priority: 2,
          assignee: { name: "Alice" },
          creator: { name: "Bob" },
        },
      })
    );

    expect(event.priority).toBe(EventPriority.HIGH);
    expect(event.shouldSend).toBe(true);
    expect(event.message).toContain("New Issue Created");
    expect(event.message).toContain("ENG-42");
    expect(event.message).toContain("Login broken");
    expect(event.message).toContain("High");
    expect(event.message).toContain("Alice");
    expect(event.message).toContain("Bob");
  });

  it("falls back to Unassigned when assignee is missing", () => {
    const event = parseLinearWebhook(
      basePayload({
        type: "Issue",
        action: "create",
        data: {
          title: "No one's problem",
          number: 1,
          team: { key: "ENG" },
          priority: 4,
          creator: { name: "Bob" },
        },
      })
    );

    expect(event.message).toContain("Unassigned");
  });

  it("formats a Comment create with truncated body", () => {
    const longBody = "a".repeat(250);
    const event = parseLinearWebhook(
      basePayload({
        type: "Comment",
        action: "create",
        data: {
          body: longBody,
          user: { name: "Alice" },
          issue: { title: "Login broken" },
        },
      })
    );

    expect(event.priority).toBe(EventPriority.MEDIUM);
    expect(event.shouldSend).toBe(true);
    expect(event.message).toContain("New Comment");
    expect(event.message).toContain("Alice");
    expect(event.message).toContain("Login broken");
    expect(event.message).toContain("...");
    expect(event.message).not.toContain("a".repeat(250));
  });

  it("formats a Project create", () => {
    const event = parseLinearWebhook(
      basePayload({
        type: "Project",
        action: "create",
        data: { name: "Q3 Launch", lead: { name: "Carol" }, description: "Ship it." },
      })
    );

    expect(event.shouldSend).toBe(true);
    expect(event.message).toContain("Q3 Launch");
    expect(event.message).toContain("Carol");
  });

  it("formats a ProjectUpdate with health emoji", () => {
    const event = parseLinearWebhook(
      basePayload({
        type: "ProjectUpdate",
        action: "create",
        data: {
          project: { name: "Q3 Launch" },
          user: { name: "Carol" },
          health: "atRisk",
          body: "Slipping by a week.",
        },
      })
    );

    expect(event.priority).toBe(EventPriority.HIGH);
    expect(event.message).toContain("🟡");
    expect(event.message).toContain("Q3 Launch");
    expect(event.message).toContain("Slipping by a week.");
  });

  it("formats a Cycle create", () => {
    const event = parseLinearWebhook(
      basePayload({
        type: "Cycle",
        action: "create",
        data: { name: "Sprint 5", number: 5, team: { name: "Engineering" } },
      })
    );

    expect(event.shouldSend).toBe(true);
    expect(event.message).toContain("Sprint 5");
    expect(event.message).toContain("Engineering");
  });

  it("formats a Document create", () => {
    const event = parseLinearWebhook(
      basePayload({
        type: "Document",
        action: "create",
        data: { title: "RFC", project: { name: "Q3 Launch" }, creator: { name: "Dave" } },
      })
    );

    expect(event.shouldSend).toBe(true);
    expect(event.message).toContain("RFC");
    expect(event.message).toContain("Dave");
  });

  it("formats an Initiative create", () => {
    const event = parseLinearWebhook(
      basePayload({
        type: "Initiative",
        action: "create",
        data: { name: "Reliability", description: "Reduce error rate." },
      })
    );

    expect(event.priority).toBe(EventPriority.HIGH);
    expect(event.message).toContain("Reliability");
  });

  it("formats an SLA breached event with severity emoji", () => {
    const event = parseLinearWebhook(
      basePayload({
        type: "IssueSLA",
        action: "breached",
        data: { issue: { title: "Login broken" } },
      })
    );

    expect(event.priority).toBe(EventPriority.HIGH);
    expect(event.message).toContain("🚨");
    expect(event.message).toContain("Login broken");
  });

  it("formats an OAuthAppRevoked event", () => {
    const event = parseLinearWebhook(
      basePayload({ type: "OAuthAppRevoked", action: "remove", data: {} })
    );

    expect(event.priority).toBe(EventPriority.HIGH);
    expect(event.message).toContain("OAuth");
  });

  it("ignores Reaction events", () => {
    const event = parseLinearWebhook(basePayload({ type: "Reaction", action: "create", data: {} }));
    expect(shouldNotifyDiscord(event)).toBe(false);
  });

  it("marks IssueAttachment as not-send (too noisy)", () => {
    const event = parseLinearWebhook(
      basePayload({
        type: "IssueAttachment",
        action: "create",
        data: {
          title: "screenshot.png",
          issue: { title: "Login broken" },
          creator: { name: "Alice" },
        },
      })
    );
    expect(shouldNotifyDiscord(event)).toBe(false);
  });

  it("returns IGNORE for malformed payloads", () => {
    const event = parseLinearWebhook({ not: "a webhook" });
    expect(event.priority).toBe(EventPriority.IGNORE);
    expect(event.shouldSend).toBe(false);
  });
});

describe("formatDiscordMessage", () => {
  it("returns empty string for events that should not be sent", () => {
    const event = parseLinearWebhook(basePayload({ type: "Reaction", action: "create", data: {} }));
    expect(formatDiscordMessage(event)).toBe("");
  });

  it("appends a UTC timestamp for high-priority events", () => {
    const event = parseLinearWebhook(
      basePayload({ type: "OAuthAppRevoked", action: "remove", data: {} })
    );
    expect(formatDiscordMessage(event)).toMatch(/\*\d{2}:\d{2}(?: [AP]M)? UTC\*$/);
  });

  it("does not append a timestamp for medium-priority events", () => {
    const event = parseLinearWebhook(
      basePayload({
        type: "Comment",
        action: "create",
        data: { body: "hi", user: { name: "Alice" }, issue: { title: "x" } },
      })
    );
    expect(formatDiscordMessage(event)).not.toMatch(/UTC\*$/);
  });
});
