import { z } from "zod";

// Zod schemas for webhook payload validation
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

export interface LinearCycle {
  name?: string;
  number?: number;
  startsAt?: string;
  endsAt?: string;
  team?: LinearTeam;
}

export interface LinearDocument {
  title?: string;
  project?: LinearProject;
  creator?: LinearUser;
}

export interface LinearInitiative {
  name?: string;
  description?: string;
}

export interface LinearInitiativeUpdate {
  initiative?: LinearInitiative;
  user?: LinearUser;
  body?: string;
}

export interface LinearIssueAttachment {
  title?: string;
  url?: string;
  issue?: LinearIssue;
  creator?: LinearUser;
}

export interface LinearIssueLabel {
  name?: string;
  color?: string;
  team?: LinearTeam;
}

export interface LinearReaction {
  emoji?: string;
  user?: LinearUser;
  comment?: LinearComment;
}

export interface LinearCustomer {
  name?: string;
  email?: string;
}

export interface LinearCustomerRequest {
  customer?: LinearCustomer;
  issue?: LinearIssue;
  title?: string;
}

export interface LinearIssueSLA {
  issue?: LinearIssue;
  breachesAt?: string;
  status?: string;
}
