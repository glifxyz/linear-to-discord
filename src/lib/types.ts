import { z } from "zod";

// Zod schemas for webhook payload validation
export const WebhookPayloadSchema = z.object({
  action: z.enum(["create", "update", "remove"]),
  type: z.enum(["Issue", "Comment"]),
  createdAt: z.string(),
  data: z.record(z.any()),
  url: z.string(),
  organizationId: z.string(),
  webhookTimestamp: z.number(),
  updatedFrom: z.record(z.any()).optional(),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// Event priority levels
export enum EventPriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  IGNORE = "ignore",
}

// Parsed event result
export interface ParsedEvent {
  message: string;
  priority: EventPriority;
  shouldSend: boolean;
}

// Simple mapping of Linear priority numbers to labels
export const PRIORITY_LABELS = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
} as const;

export type LinearPriority = keyof typeof PRIORITY_LABELS;
