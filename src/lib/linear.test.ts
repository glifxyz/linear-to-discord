import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  formatEvent,
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
    createdAt: "2026-04-28T00:00:00.000Z",
    url: "https://linear.app/team/issue/ENG-1",
    organizationId: "org-1",
    webhookTimestamp: 1745798400000,
    data: {},
    ...overrides,
  });

describe("formatEvent", () => {
  it("formats Issue create with priority and assignee", () => {
    const msg = formatEvent(
      payload({
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
    expect(msg).toContain("New Issue Created");
    expect(msg).toContain("ENG-42");
    expect(msg).toContain("Login broken");
    expect(msg).toContain("High");
    expect(msg).toContain("Alice");
    expect(msg).toContain("Bob");
  });

  it("falls back to Unassigned when assignee is missing", () => {
    const msg = formatEvent(
      payload({
        type: "Issue",
        action: "create",
        data: {
          title: "x",
          number: 1,
          team: { key: "ENG" },
          priority: 4,
          creator: { name: "Bob" },
        },
      })
    );
    expect(msg).toContain("Unassigned");
  });

  it("formats Comment create with truncated body", () => {
    const longBody = "a".repeat(250);
    const msg = formatEvent(
      payload({
        type: "Comment",
        action: "create",
        data: { body: longBody, user: { name: "Alice" }, issue: { title: "Login broken" } },
      })
    );
    expect(msg).toContain("New Comment");
    expect(msg).toContain("Alice");
    expect(msg).toContain("Login broken");
    expect(msg).toContain("...");
    expect(msg).not.toContain("a".repeat(250));
  });

  it("formats Project create", () => {
    const msg = formatEvent(
      payload({
        type: "Project",
        action: "create",
        data: { name: "Q3 Launch", lead: { name: "Carol" }, description: "Ship it." },
      })
    );
    expect(msg).toContain("Q3 Launch");
    expect(msg).toContain("Carol");
  });

  it("formats ProjectUpdate with health emoji", () => {
    const msg = formatEvent(
      payload({
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
    expect(msg).toContain("🟡");
    expect(msg).toContain("Q3 Launch");
    expect(msg).toContain("Slipping by a week.");
  });

  it("formats Cycle create", () => {
    const msg = formatEvent(
      payload({
        type: "Cycle",
        action: "create",
        data: { name: "Sprint 5", number: 5, team: { name: "Engineering" } },
      })
    );
    expect(msg).toContain("Sprint 5");
    expect(msg).toContain("Engineering");
  });

  it("formats Document create", () => {
    const msg = formatEvent(
      payload({
        type: "Document",
        action: "create",
        data: { title: "RFC", project: { name: "Q3 Launch" }, creator: { name: "Dave" } },
      })
    );
    expect(msg).toContain("RFC");
    expect(msg).toContain("Dave");
  });

  it("formats Initiative create", () => {
    const msg = formatEvent(
      payload({
        type: "Initiative",
        action: "create",
        data: { name: "Reliability", description: "Reduce error rate." },
      })
    );
    expect(msg).toContain("Reliability");
  });

  it("formats SLA breached with severity emoji", () => {
    const msg = formatEvent(
      payload({ type: "IssueSLA", action: "breached", data: { issue: { title: "Login broken" } } })
    );
    expect(msg).toContain("🚨");
    expect(msg).toContain("Login broken");
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
      formatEvent(
        payload({
          type: "IssueAttachment",
          action: "create",
          data: { title: "screenshot.png", issue: { title: "x" }, creator: { name: "Alice" } },
        })
      )
    ).toBeNull();
  });

  it("returns null for an unsupported action on a known type", () => {
    expect(
      formatEvent(payload({ type: "Issue", action: "remove", data: { number: 1 } }))
    ).toBeNull();
  });
});
