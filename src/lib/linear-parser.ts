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
  LinearCycle,
  LinearDocument,
  LinearInitiative,
  LinearInitiativeUpdate,
  LinearIssueAttachment,
  LinearIssueLabel,
  LinearCustomer,
  LinearCustomerRequest,
  LinearIssueSLA,
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
    case "Cycle":
      return formatCycleMessage(action, data);
    case "Document":
      return formatDocumentMessage(action, data);
    case "Initiative":
      return formatInitiativeMessage(action, data);
    case "InitiativeUpdate":
      return formatInitiativeUpdateMessage(action, data);
    case "IssueAttachment":
      return formatIssueAttachmentMessage(action, data);
    case "IssueLabel":
      return formatIssueLabelMessage(action, data);
    case "Reaction":
      return formatReactionMessage();
    case "Customer":
      return formatCustomerMessage(action, data);
    case "CustomerRequest":
      return formatCustomerRequestMessage(action, data);
    case "User":
      return formatUserMessage(action, data);
    case "IssueSLA":
      return formatIssueSLAMessage(action, data);
    case "OAuthAppRevoked":
      return formatOAuthRevokedMessage();
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

const formatCycleMessage = (action: string, data: LinearCycle): ParsedEvent => {
  const { name, number, team } = data;

  if (action === "create") {
    return {
      message: `🔄 **New Cycle Created:** ${team?.name} - ${name} (${number})`,
      priority: EventPriority.HIGH,
      shouldSend: true,
    };
  }

  if (action === "update") {
    return {
      message: `🔄 **Cycle Updated:** ${team?.name} - ${name}`,
      priority: EventPriority.LOW,
      shouldSend: true,
    };
  }

  return createUnsupportedEvent(`Unsupported cycle action: ${action}`);
};

const formatDocumentMessage = (
  action: string,
  data: LinearDocument
): ParsedEvent => {
  const { title, project, creator } = data;

  if (action === "create") {
    return {
      message: `📄 **New Document:** ${title}\n**Project:** ${
        project?.name || "None"
      }\n**Creator:** ${creator?.name}`,
      priority: EventPriority.LOW,
      shouldSend: true,
    };
  }

  return createUnsupportedEvent(`Document ${action} events are ignored`);
};

const formatInitiativeMessage = (
  action: string,
  data: LinearInitiative
): ParsedEvent => {
  const { name, description } = data;

  if (action === "create") {
    return {
      message: `🎯 **New Initiative:** ${name}${
        description ? `\n${truncateText(description, 100)}` : ""
      }`,
      priority: EventPriority.HIGH,
      shouldSend: true,
    };
  }

  return createUnsupportedEvent(`Initiative ${action} events are ignored`);
};

const formatInitiativeUpdateMessage = (
  action: string,
  data: LinearInitiativeUpdate
): ParsedEvent => {
  const { initiative, user, body } = data;

  if (action === "create") {
    return {
      message: `🎯 **Initiative Update:** ${initiative?.name}\n**Author:** ${
        user?.name
      }${body ? `\n${truncateText(body)}` : ""}`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  return createUnsupportedEvent(
    `Initiative update ${action} events are ignored`
  );
};

const formatIssueAttachmentMessage = (
  action: string,
  data: LinearIssueAttachment
): ParsedEvent => {
  const { title, issue, creator } = data;

  if (action === "create") {
    return {
      message: `📎 **Attachment Added:** ${title}\n**Issue:** ${issue?.title}\n**By:** ${creator?.name}`,
      priority: EventPriority.LOW,
      shouldSend: false, // Usually too noisy
    };
  }

  return createUnsupportedEvent(`Attachment ${action} events are ignored`);
};

const formatIssueLabelMessage = (
  action: string,
  data: LinearIssueLabel
): ParsedEvent => {
  const { name, team } = data;

  if (action === "create") {
    return {
      message: `🏷️ **New Label Created:** ${name} in ${team?.name}`,
      priority: EventPriority.LOW,
      shouldSend: false, // Administrative, usually not needed
    };
  }

  return createUnsupportedEvent(`Label ${action} events are ignored`);
};

const formatReactionMessage = (): ParsedEvent => {
  // Reactions are usually too noisy for Discord
  return createUnsupportedEvent(`Reaction events are ignored`);
};

const formatCustomerMessage = (
  action: string,
  data: LinearCustomer
): ParsedEvent => {
  const { name, email } = data;

  if (action === "create") {
    return {
      message: `👤 **New Customer:** ${name} (${email})`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  return createUnsupportedEvent(`Customer ${action} events are ignored`);
};

const formatCustomerRequestMessage = (
  action: string,
  data: LinearCustomerRequest
): ParsedEvent => {
  const { customer, issue, title } = data;

  if (action === "create") {
    return {
      message: `📮 **Customer Request:** ${
        title || issue?.title
      }\n**Customer:** ${customer?.name}\n**Issue:** ${issue?.title}`,
      priority: EventPriority.HIGH,
      shouldSend: true,
    };
  }

  return createUnsupportedEvent(
    `Customer request ${action} events are ignored`
  );
};

const formatUserMessage = (action: string, data: LinearUser): ParsedEvent => {
  const { name } = data;

  if (action === "create") {
    return {
      message: `👋 **New Team Member:** ${name} joined the workspace`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  return createUnsupportedEvent(`User ${action} events are ignored`);
};

const formatIssueSLAMessage = (
  action: string,
  data: LinearIssueSLA
): ParsedEvent => {
  const { issue, breachesAt } = data;

  switch (action) {
    case "set":
      return {
        message: `⏰ **SLA Set:** ${issue?.title}\n**Breaches at:** ${breachesAt}`,
        priority: EventPriority.MEDIUM,
        shouldSend: true,
      };
    case "highRisk":
      return {
        message: `⚠️ **SLA High Risk:** ${issue?.title} is at risk of breaching SLA`,
        priority: EventPriority.HIGH,
        shouldSend: true,
      };
    case "breached":
      return {
        message: `🚨 **SLA BREACHED:** ${issue?.title} has breached its SLA`,
        priority: EventPriority.HIGH,
        shouldSend: true,
      };
    default:
      return createUnsupportedEvent(`Unsupported SLA action: ${action}`);
  }
};

const formatOAuthRevokedMessage = (): ParsedEvent => {
  return {
    message: `🔐 **OAuth App Access Revoked** - Please check your Linear integration settings`,
    priority: EventPriority.HIGH,
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
