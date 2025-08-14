import {
  WebhookPayload,
  WebhookPayloadSchema,
  ParsedEvent,
  EventPriority,
  PRIORITY_LABELS,
  LinearTeam,
  LinearUser,
  LinearIssue,
  LinearComment,
  LinearProject,
  LinearProjectUpdate,
} from "./linear-types";

// Helper functions
const createUnsupportedEvent = (message: string): ParsedEvent => ({
  message,
  priority: EventPriority.IGNORE,
  shouldSend: false,
});

const getIssueId = (team: LinearTeam | undefined, number: number): string =>
  `${team?.key}-${number}`;
const getAssigneeName = (assignee: LinearUser | undefined): string =>
  assignee?.name || "Unassigned";

const getHealthEmoji = (health: string): string => {
  switch (health) {
    case "onTrack":
      return "🟢";
    case "atRisk":
      return "🟡";
    case "offTrack":
      return "🔴";
    case "completed":
      return "✅";
    default:
      return "⚪";
  }
};

const truncateText = (text: string, maxLength: number = 200): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Simple webhook parser using Linear SDK patterns
export const parseLinearWebhook = (payload: unknown): ParsedEvent => {
  try {
    // Validate payload structure with Zod
    const validatedPayload = WebhookPayloadSchema.parse(payload);

    return routeLinearEvent(validatedPayload);
  } catch (error) {
    console.error("Invalid webhook payload:", error);
    return createUnsupportedEvent("Invalid webhook payload");
  }
};

const routeLinearEvent = (payload: WebhookPayload): ParsedEvent => {
  const { action, type, data } = payload;

  switch (type) {
    case "Issue":
      return formatIssueMessage(action, data);
    case "Comment":
      return formatCommentMessage(action, data);
    case "Project":
      return formatProjectMessage(action, data);
    case "ProjectUpdate":
      return formatProjectUpdateMessage(action, data);
    default:
      return createUnsupportedEvent(`Unsupported event: ${type}`);
  }
};

const formatIssueMessage = (action: string, data: LinearIssue): ParsedEvent => {
  const { title, number, team, state, priority, assignee, creator } = data;
  const issueId = getIssueId(team, number || 0);
  const assigneeName = getAssigneeName(assignee);

  switch (action) {
    case "create":
      const priorityLabel =
        PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] || "Unknown";
      return {
        message: `🆕 **New Issue Created**\n**${issueId}**: ${title}\n**Priority**: ${priorityLabel}\n**Assignee**: ${assigneeName}\n**Creator**: ${creator?.name}`,
        priority:
          (priority || 4) <= 2 ? EventPriority.HIGH : EventPriority.MEDIUM,
        shouldSend: true,
      };

    case "update":
      return {
        message: `📝 **Issue Updated**\n**${issueId}**: ${title}\n**Status**: ${state?.name}\n**Assignee**: ${assigneeName}`,
        priority: EventPriority.LOW,
        shouldSend: true,
      };

    default:
      return createUnsupportedEvent(`Unsupported issue action: ${action}`);
  }
};

const formatCommentMessage = (
  action: string,
  data: LinearComment
): ParsedEvent => {
  if (action !== "create") {
    return createUnsupportedEvent(`Unsupported comment action: ${action}`);
  }

  const { body, user, issue } = data;
  const truncatedBody =
    body && body.length > 200 ? `${body.slice(0, 200)}...` : body || "";

  return {
    message: `💬 **New Comment**\n**Issue**: ${issue?.title}\n**Author**: ${user?.name}\n**Comment**: ${truncatedBody}`,
    priority: EventPriority.MEDIUM,
    shouldSend: true,
  };
};

const formatProjectMessage = (
  action: string,
  data: LinearProject
): ParsedEvent => {
  const { name, description, lead } = data;

  if (action === "create") {
    let message = `📊 **New Project Created:** ${name}`;
    if (lead?.name) message += `\n**Lead:** ${lead.name}`;
    if (description)
      message += `\n**Description:** ${truncateText(description, 100)}`;

    return {
      message,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  if (action === "update") {
    return {
      message: `📊 **Project Updated:** ${name}`,
      priority: EventPriority.LOW,
      shouldSend: true,
    };
  }

  return createUnsupportedEvent(`Unsupported project action: ${action}`);
};

const formatProjectUpdateMessage = (
  action: string,
  data: LinearProjectUpdate
): ParsedEvent => {
  const { project, user, health, body } = data;

  if (action === "create") {
    const healthEmoji = getHealthEmoji(health || "unknown");
    let message = `${healthEmoji} **Project Update:** ${project?.name}`;
    message += `\n**Author:** ${user?.name}`;
    message += `\n**Status:** ${health}`;
    if (body) {
      const cleanBody = body.replace(/\n/g, " ").trim();
      message += `\n**Update:** ${truncateText(cleanBody)}`;
    }

    return {
      message,
      priority: EventPriority.HIGH,
      shouldSend: true,
    };
  }

  if (action === "update") {
    const healthEmoji = getHealthEmoji(health || "unknown");
    return {
      message: `${healthEmoji} **Project Update Modified:** ${project?.name} by ${user?.name}`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  return createUnsupportedEvent(`Unsupported project update action: ${action}`);
};

export const shouldNotifyDiscord = (event: ParsedEvent): boolean => {
  return event.shouldSend && event.priority !== EventPriority.IGNORE;
};

export const formatDiscordMessage = (event: ParsedEvent): string => {
  if (!shouldNotifyDiscord(event)) return "";

  // Add timestamp for high priority events
  if (event.priority === EventPriority.HIGH) {
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
    return `${event.message}\n\n*${timestamp} UTC*`;
  }

  return event.message;
};
