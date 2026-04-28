import { z } from "zod";

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

export enum EventPriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  IGNORE = "ignore",
}

export interface ParsedEvent {
  message: string;
  priority: EventPriority;
  shouldSend: boolean;
}

export const PRIORITY_LABELS = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
} as const;

export type LinearPriority = keyof typeof PRIORITY_LABELS;

export interface LinearTeam {
  key?: string;
  name?: string;
}

export interface LinearUser {
  name?: string;
}

export interface LinearState {
  name?: string;
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
  issue?: LinearIssue;
  creator?: LinearUser;
}

export interface LinearIssueLabel {
  name?: string;
  team?: LinearTeam;
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
}
