// Core webhook types
export type LinearWebhookAction = 'create' | 'update' | 'remove';
export type LinearWebhookType =
  | 'Issue'
  | 'Comment'
  | 'Project'
  | 'ProjectUpdate'
  | 'Cycle'
  | 'IssueSla';

export interface LinearWebhookPayload<T = any> {
  action: LinearWebhookAction;
  type: LinearWebhookType;
  createdAt: string;
  data: T;
  url: string;
  organizationId: string;
  webhookTimestamp: number;
  updatedFrom?: Record<string, any>;
}

// User types
export interface User {
  id: string;
  name: string;
  email?: string;
  displayName?: string;
}

// Team types
export interface Team {
  id: string;
  key: string;
  name: string;
  description?: string;
}

// State types
export interface IssueState {
  id: string;
  name: string;
  color: string;
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
}

// Label types
export interface IssueLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
}

// Priority types
export type IssuePriority = 0 | 1 | 2 | 3 | 4;

// Issue types
export interface Issue {
  id: string;
  number: number;
  title: string;
  description?: string;
  priority: IssuePriority;
  priorityLabel: string;
  state: IssueState;
  team: Team;
  assignee?: User;
  assigneeId?: string;
  creator: User;
  creatorId: string;
  labels: IssueLabel[];
  labelIds: string[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  estimate?: number;
  parent?: Issue;
  parentId?: string;
  project?: Project;
  projectId?: string;
  cycle?: Cycle;
  cycleId?: string;
}

// Comment types
export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  userId: string;
  issue: Issue;
  issueId: string;
  reactionData?: any[];
}

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  state:
    | 'backlog'
    | 'planned'
    | 'started'
    | 'paused'
    | 'completed'
    | 'canceled';
  startDate?: string;
  targetDate?: string;
  completedAt?: string;
  creator: User;
  creatorId: string;
  lead?: User;
  leadId?: string;
  teams: Team[];
  members: User[];
  createdAt: string;
  updatedAt: string;
  progress: number;
  icon?: string;
  color?: string;
}

// Project Update types
export interface ProjectUpdate {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  userId: string;
  project: Project;
  projectId: string;
  health: 'onTrack' | 'atRisk' | 'offTrack';
}

// Cycle types
export interface Cycle {
  id: string;
  name: string;
  description?: string;
  number: number;
  startDate: string;
  endDate: string;
  completedAt?: string;
  team: Team;
  teamId: string;
  createdAt: string;
  updatedAt: string;
  progress: number;
  completedIssueCountHistory: number[];
  completedEstimateHistory: number[];
  issueCountHistory: number[];
  scopeHistory: number[];
}

// SLA types
export interface IssueSla {
  id: string;
  name: string;
  breachedAt?: string;
  responseTime?: number;
  resolutionTime?: number;
}

// Specific event payload types
export interface IssueWebhookPayload extends LinearWebhookPayload<Issue> {
  type: 'Issue';
}

export interface CommentWebhookPayload extends LinearWebhookPayload<Comment> {
  type: 'Comment';
}

export interface ProjectWebhookPayload extends LinearWebhookPayload<Project> {
  type: 'Project';
}

export interface ProjectUpdateWebhookPayload
  extends LinearWebhookPayload<ProjectUpdate> {
  type: 'ProjectUpdate';
}

export interface CycleWebhookPayload extends LinearWebhookPayload<Cycle> {
  type: 'Cycle';
}

export interface IssueSlaWebhookPayload extends LinearWebhookPayload<IssueSla> {
  type: 'IssueSla';
}

// Union type for all webhook payloads
export type AnyLinearWebhookPayload =
  | IssueWebhookPayload
  | CommentWebhookPayload
  | ProjectWebhookPayload
  | ProjectUpdateWebhookPayload
  | CycleWebhookPayload
  | IssueSlaWebhookPayload;

// Event priority levels
export enum EventPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  IGNORE = 'ignore',
}

// Parsed event result
export interface ParsedEvent {
  message: string;
  priority: EventPriority;
  shouldSend: boolean;
}

// Error types
export const LINEAR_WEBHOOK_ERRORS = {
  UNKNOWN_EVENT: 'UNKNOWN_EVENT',
  UNSUPPORTED_ACTION: 'UNSUPPORTED_ACTION',
  MISSING_DATA: 'MISSING_DATA',
  IGNORED_EVENT: 'IGNORED_EVENT',
} as const;

export type LinearWebhookError =
  (typeof LINEAR_WEBHOOK_ERRORS)[keyof typeof LINEAR_WEBHOOK_ERRORS];
