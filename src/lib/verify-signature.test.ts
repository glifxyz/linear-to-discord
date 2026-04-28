import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyLinearSignature } from "./verify-signature";

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

  it("rejects a header that is not a string (array)", () => {
    expect(verifyLinearSignature(body, [sign(body, secret)], secret)).toBe(false);
  });

  it("rejects a header of wrong length without throwing", () => {
    expect(verifyLinearSignature(body, "deadbeef", secret)).toBe(false);
  });
});
