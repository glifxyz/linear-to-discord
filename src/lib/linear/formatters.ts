import type { Cycle, Issue, Project } from './types';
import { EventPriority } from './types';

// Priority emoji mapping
const PRIORITY_EMOJIS = {
  0: '', // No priority
  1: '🔽', // Low
  2: '🟡', // Medium
  3: '🟠', // High
  4: '🔴', // Urgent
} as const;

// State type emoji mapping
const STATE_EMOJIS = {
  backlog: '📋',
  unstarted: '⏸️',
  started: '🟡',
  completed: '✅',
  canceled: '❌',
} as const;

// Project health emoji mapping
const HEALTH_EMOJIS = {
  onTrack: '🟢',
  atRisk: '🟡',
  offTrack: '🔴',
} as const;

// Format issue identifier
export const formatIssueIdentifier = (issue: Issue): string => {
  return `[${issue.team.key}-${issue.number}]`;
};

// Format user mention
export const formatUser = (user: {
  name: string;
  displayName?: string;
}): string => {
  return user.displayName || user.name;
};

// Format priority
export const formatPriority = (priority: number): string => {
  return PRIORITY_EMOJIS[priority as keyof typeof PRIORITY_EMOJIS] || '';
};

// Format state
export const formatState = (state: { name: string; type: string }): string => {
  const emoji = STATE_EMOJIS[state.type as keyof typeof STATE_EMOJIS] || '';
  return `${emoji} ${state.name}`;
};

// Format project health
export const formatProjectHealth = (health: string): string => {
  const emoji = HEALTH_EMOJIS[health as keyof typeof HEALTH_EMOJIS] || '';
  return `${emoji} ${health}`;
};

// Format issue title with link
export const formatIssueLink = (issue: Issue, url: string): string => {
  const identifier = formatIssueIdentifier(issue);
  const priority = formatPriority(issue.priority);
  return `${priority} ${identifier} [${issue.title}](${url})`;
};

// Format project link
export const formatProjectLink = (project: Project, url: string): string => {
  return `📋 [${project.name}](${url})`;
};

// Format cycle link
export const formatCycleLink = (cycle: Cycle, url: string): string => {
  return `🔄 [${cycle.name}](${url})`;
};

// Format assignee change
export const formatAssigneeChange = (
  oldAssignee: string | undefined,
  newAssignee: string | undefined
): string => {
  if (!oldAssignee && newAssignee) {
    return `→ ${newAssignee}`;
  }
  if (oldAssignee && !newAssignee) {
    return `← ${oldAssignee}`;
  }
  if (oldAssignee && newAssignee) {
    return `${oldAssignee} → ${newAssignee}`;
  }
  return '';
};

// Format label changes
export const formatLabelChange = (
  oldLabels: string[],
  newLabels: string[]
): string => {
  const added = newLabels.filter((label) => !oldLabels.includes(label));
  const removed = oldLabels.filter((label) => !newLabels.includes(label));

  const changes = [];
  if (added.length > 0) {
    changes.push(`+${added.join(', ')}`);
  }
  if (removed.length > 0) {
    changes.push(`-${removed.join(', ')}`);
  }

  return changes.join(' ');
};

// Format comment body as blockquote
export const formatCommentBody = (
  body: string,
  maxLength: number = 200
): string => {
  const truncated =
    body.length > maxLength ? `${body.substring(0, maxLength)}...` : body;
  return truncated
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
};

// Format project progress
export const formatProgress = (progress: number): string => {
  const percentage = Math.round(progress * 100);
  return `${percentage}%`;
};

// Format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

// Get priority level for Discord message styling
export const getPriorityLevel = (priority: EventPriority): string => {
  switch (priority) {
    case EventPriority.HIGH:
      return '🚨';
    case EventPriority.MEDIUM:
      return '📢';
    case EventPriority.LOW:
      return '💬';
    default:
      return '';
  }
};
