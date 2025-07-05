import {
  formatAssigneeChange,
  formatIssueLink,
  formatLabelChange,
  formatState,
  formatUser,
  getPriorityLevel,
} from '../formatters';
import type { IssueWebhookPayload, ParsedEvent } from '../types';
import { EventPriority, LINEAR_WEBHOOK_ERRORS } from '../types';

// Parse issue creation
export const parseIssueCreation = (
  payload: IssueWebhookPayload
): ParsedEvent => {
  const { data: issue, url } = payload;

  // High priority for urgent/high priority issues
  const priority =
    issue.priority >= 3 ? EventPriority.HIGH : EventPriority.MEDIUM;
  const priorityIcon = getPriorityLevel(priority);

  const issueLink = formatIssueLink(issue, url);
  const creator = formatUser(issue.creator);

  let message = `${priorityIcon} **New Issue Created**\n${issueLink}`;

  // Add creator info
  message += `\n*Created by ${creator}*`;

  // Add assignee if assigned
  if (issue.assignee) {
    message += `\n*Assigned to ${formatUser(issue.assignee)}*`;
  }

  // Add labels if any
  if (issue.labels.length > 0) {
    const labels = issue.labels.map((label) => label.name).join(', ');
    message += `\n*Labels: ${labels}*`;
  }

  return {
    message,
    priority,
    shouldSend: true,
  };
};

// Parse issue updates
export const parseIssueUpdate = (payload: IssueWebhookPayload): ParsedEvent => {
  const { data: issue, url, updatedFrom } = payload;

  if (!updatedFrom) {
    return {
      message: LINEAR_WEBHOOK_ERRORS.MISSING_DATA,
      priority: EventPriority.IGNORE,
      shouldSend: false,
    };
  }

  const issueLink = formatIssueLink(issue, url);

  // Handle state changes
  if (updatedFrom.stateId && updatedFrom.stateId !== issue.state.id) {
    const newState = formatState(issue.state);

    // Completion is high priority
    if (issue.state.type === 'completed') {
      return {
        message: `🚨 **Issue Completed**\n${issueLink}\n${newState}`,
        priority: EventPriority.HIGH,
        shouldSend: true,
      };
    }

    // Cancellation is high priority
    if (issue.state.type === 'canceled') {
      return {
        message: `🚨 **Issue Canceled**\n${issueLink}\n${newState}`,
        priority: EventPriority.HIGH,
        shouldSend: true,
      };
    }

    // Other state changes are medium priority
    return {
      message: `📢 **Issue Status Changed**\n${issueLink}\n${newState}`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  // Handle assignee changes
  if (updatedFrom.assigneeId !== undefined) {
    const oldAssignee = updatedFrom.assigneeId ? 'Someone' : undefined; // We don't have the old assignee name
    const newAssignee = issue.assignee ? formatUser(issue.assignee) : undefined;
    const assigneeChange = formatAssigneeChange(oldAssignee, newAssignee);

    return {
      message: `🚨 **Issue Assignment Changed**\n${issueLink}\n${assigneeChange}`,
      priority: EventPriority.HIGH,
      shouldSend: true,
    };
  }

  // Handle title changes
  if (updatedFrom.title && updatedFrom.title !== issue.title) {
    return {
      message: `📢 **Issue Title Updated**\n${issueLink}\n*was: "${updatedFrom.title}"*`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  // Handle priority changes
  if (
    updatedFrom.priority !== undefined &&
    updatedFrom.priority !== issue.priority
  ) {
    const oldPriority = updatedFrom.priority;
    const newPriority = issue.priority;

    // Priority increases are more important
    const changePriority =
      newPriority > oldPriority ? EventPriority.HIGH : EventPriority.MEDIUM;

    return {
      message: `${getPriorityLevel(
        changePriority
      )} **Issue Priority Changed**\n${issueLink}\n*Priority: ${oldPriority} → ${newPriority}*`,
      priority: changePriority,
      shouldSend: true,
    };
  }

  // Handle label changes
  if (
    updatedFrom.labelIds &&
    JSON.stringify(updatedFrom.labelIds) !== JSON.stringify(issue.labelIds)
  ) {
    const oldLabels = updatedFrom.labelIds || [];
    const newLabels = issue.labelIds || [];

    // Only show if labels were actually added/removed (not just reordered)
    if (
      oldLabels.length !== newLabels.length ||
      !oldLabels.every((label: string) => newLabels.includes(label))
    ) {
      const labelChange = formatLabelChange(oldLabels, newLabels);

      return {
        message: `📢 **Issue Labels Updated**\n${issueLink}\n*${labelChange}*`,
        priority: EventPriority.MEDIUM,
        shouldSend: true,
      };
    }
  }

  // Handle due date changes
  if (
    updatedFrom.dueDate !== undefined &&
    updatedFrom.dueDate !== issue.dueDate
  ) {
    const dueDateText = issue.dueDate
      ? `Due: ${issue.dueDate}`
      : 'Due date removed';

    return {
      message: `📢 **Issue Due Date Updated**\n${issueLink}\n*${dueDateText}*`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  // Handle estimate changes
  if (
    updatedFrom.estimate !== undefined &&
    updatedFrom.estimate !== issue.estimate
  ) {
    const estimateText = issue.estimate
      ? `Estimate: ${issue.estimate}`
      : 'Estimate removed';

    return {
      message: `📢 **Issue Estimate Updated**\n${issueLink}\n*${estimateText}*`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  // For description changes and other minor updates, we ignore them
  return {
    message: LINEAR_WEBHOOK_ERRORS.IGNORED_EVENT,
    priority: EventPriority.IGNORE,
    shouldSend: false,
  };
};

// Main issue parser
export const parseIssueEvent = (payload: IssueWebhookPayload): ParsedEvent => {
  switch (payload.action) {
    case 'create':
      return parseIssueCreation(payload);
    case 'update':
      return parseIssueUpdate(payload);
    case 'remove':
      // Issues are rarely deleted, but if they are, it's worth noting
      return {
        message: `🚨 **Issue Deleted**\n${formatIssueLink(
          payload.data,
          payload.url
        )}`,
        priority: EventPriority.HIGH,
        shouldSend: true,
      };
    default:
      return {
        message: LINEAR_WEBHOOK_ERRORS.UNSUPPORTED_ACTION,
        priority: EventPriority.IGNORE,
        shouldSend: false,
      };
  }
};
