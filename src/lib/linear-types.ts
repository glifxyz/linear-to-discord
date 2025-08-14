import { z } from "zod";

// Zod schemas for webhook payload validation
export const WebhookPayloadSchema = z.object({
  action: z.enum(["create", "update", "remove"]),
  type: z.enum(["Issue", "Comment", "Project", "ProjectUpdate"]),
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

// Linear entity types based on webhook data structure
export interface LinearTeam {
  key?: string;
  name?: string;
}

export interface LinearUser {
  name?: string;
  id?: string;
}

export interface LinearState {
  name?: string;
  id?: string;
}

export interface LinearIssue {
  title?: string;
  number?: number;
  team?: LinearTeam;
  state?: LinearState;
  priority?: LinearPriority;
  assignee?: LinearUser;
  creator?: LinearUser;
}

export interface LinearComment {
  body?: string;
  user?: LinearUser;
  issue?: LinearIssue;
}

export interface LinearProject {
  name?: string;
  description?: string;
  lead?: LinearUser;
}

export interface LinearProjectUpdate {
  project?: LinearProject;
  user?: LinearUser;
  health?: string;
  body?: string;
}
