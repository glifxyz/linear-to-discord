import {
  WebhookPayload,
  WebhookPayloadSchema,
  ParsedEvent,
  EventPriority,
  PRIORITY_LABELS,
} from "./types";

// Simple webhook parser using Linear SDK patterns
export const parseWebhookEvent = (payload: unknown): ParsedEvent => {
  try {
    // Validate payload structure with Zod
    const validatedPayload = WebhookPayloadSchema.parse(payload);

    return routeWebhookEvent(validatedPayload);
  } catch (error) {
    console.error("Invalid webhook payload:", error);
    return {
      message: "Invalid webhook payload",
      priority: EventPriority.IGNORE,
      shouldSend: false,
    };
  }
};

const routeWebhookEvent = (payload: WebhookPayload): ParsedEvent => {
  const { action, type, data } = payload;

  switch (type) {
    case "Issue":
      return parseIssueEvent(action, data);
    case "Comment":
      return parseCommentEvent(action, data);
    default:
      return {
        message: `Unsupported event: ${type}`,
        priority: EventPriority.IGNORE,
        shouldSend: false,
      };
  }
};

const parseIssueEvent = (action: string, data: any): ParsedEvent => {
  const { title, number, team, state, priority, assignee, creator } = data;

  switch (action) {
    case "create":
      const priorityLabel =
        PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] || "Unknown";
      return {
        message: `🆕 **New Issue Created**\n**${
          team?.key
        }-${number}**: ${title}\n**Priority**: ${priorityLabel}\n**Assignee**: ${
          assignee?.name || "Unassigned"
        }\n**Creator**: ${creator?.name}`,
        priority: priority >= 2 ? EventPriority.HIGH : EventPriority.MEDIUM,
        shouldSend: true,
      };

    case "update":
      return {
        message: `📝 **Issue Updated**\n**${
          team?.key
        }-${number}**: ${title}\n**Status**: ${state?.name}\n**Assignee**: ${
          assignee?.name || "Unassigned"
        }`,
        priority: EventPriority.LOW,
        shouldSend: true,
      };

    default:
      return {
        message: `Unsupported issue action: ${action}`,
        priority: EventPriority.IGNORE,
        shouldSend: false,
      };
  }
};

const parseCommentEvent = (action: string, data: any): ParsedEvent => {
  const { body, user, issue } = data;

  if (action === "create") {
    return {
      message: `💬 **New Comment**\n**Issue**: ${issue?.title}\n**Author**: ${
        user?.name
      }\n**Comment**: ${body.slice(0, 200)}${body.length > 200 ? "..." : ""}`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  return {
    message: `Unsupported comment action: ${action}`,
    priority: EventPriority.IGNORE,
    shouldSend: false,
  };
};

export const shouldSendEvent = (event: ParsedEvent): boolean => {
  return event.shouldSend && event.priority !== EventPriority.IGNORE;
};

export const formatFinalMessage = (event: ParsedEvent): string => {
  if (!shouldSendEvent(event)) return "";

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
