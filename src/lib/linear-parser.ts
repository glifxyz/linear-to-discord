import {
  WebhookPayload,
  WebhookPayloadSchema,
  ParsedEvent,
  EventPriority,
  PRIORITY_LABELS,
} from "./linear-types";

// Helper functions
const createUnsupportedEvent = (message: string): ParsedEvent => ({
  message,
  priority: EventPriority.IGNORE,
  shouldSend: false,
});

const getIssueId = (team: any, number: number): string =>
  `${team?.key}-${number}`;
const getAssigneeName = (assignee: any): string =>
  assignee?.name || "Unassigned";

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
    default:
      return createUnsupportedEvent(`Unsupported event: ${type}`);
  }
};

const formatIssueMessage = (action: string, data: any): ParsedEvent => {
  const { title, number, team, state, priority, assignee, creator } = data;
  const issueId = getIssueId(team, number);
  const assigneeName = getAssigneeName(assignee);

  switch (action) {
    case "create":
      const priorityLabel =
        PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] || "Unknown";
      return {
        message: `🆕 **New Issue Created**\n**${issueId}**: ${title}\n**Priority**: ${priorityLabel}\n**Assignee**: ${assigneeName}\n**Creator**: ${creator?.name}`,
        priority: priority <= 2 ? EventPriority.HIGH : EventPriority.MEDIUM,
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

const formatCommentMessage = (action: string, data: any): ParsedEvent => {
  if (action !== "create") {
    return createUnsupportedEvent(`Unsupported comment action: ${action}`);
  }

  const { body, user, issue } = data;
  const truncatedBody = body.length > 200 ? `${body.slice(0, 200)}...` : body;

  return {
    message: `💬 **New Comment**\n**Issue**: ${issue?.title}\n**Author**: ${user?.name}\n**Comment**: ${truncatedBody}`,
    priority: EventPriority.MEDIUM,
    shouldSend: true,
  };
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
