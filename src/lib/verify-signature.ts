import { createHmac, timingSafeEqual } from "node:crypto";

export const verifyLinearSignature = (
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined,
  secret: string
): boolean => {
  if (typeof signatureHeader !== "string" || signatureHeader.length === 0) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  // Buffers must be equal length for timingSafeEqual; bail early on mismatch.
  if (expected.length !== signatureHeader.length) return false;

  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signatureHeader, "hex"));
};
