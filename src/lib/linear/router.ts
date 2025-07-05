import { parseCommentEvent } from './parsers/comment';
import { parseCycleEvent } from './parsers/cycle';
import { parseIssueEvent } from './parsers/issue';
import { parseProjectEvent } from './parsers/project';
import { parseProjectUpdateEvent } from './parsers/projectUpdate';
import { parseSlaEvent } from './parsers/sla';
import type { AnyLinearWebhookPayload, ParsedEvent } from './types';
import { EventPriority, LINEAR_WEBHOOK_ERRORS } from './types';

// Main webhook router that delegates to appropriate parsers
export const parseLinearWebhook = (
  payload: AnyLinearWebhookPayload
): ParsedEvent => {
  try {
    // Validate payload structure
    if (!payload || !payload.type || !payload.action || !payload.data) {
      console.error('Invalid webhook payload structure:', payload);
      return {
        message: LINEAR_WEBHOOK_ERRORS.MISSING_DATA,
        priority: EventPriority.IGNORE,
        shouldSend: false,
      };
    }

    // Route to appropriate parser based on event type
    switch (payload.type) {
      case 'Issue':
        return parseIssueEvent(payload);

      case 'Comment':
        return parseCommentEvent(payload);

      case 'Project':
        return parseProjectEvent(payload);

      case 'ProjectUpdate':
        return parseProjectUpdateEvent(payload);

      case 'Cycle':
        return parseCycleEvent(payload);

      case 'IssueSla':
        return parseSlaEvent(payload);

      default:
        console.warn('Unsupported webhook event type:', (payload as any).type);
        return {
          message: LINEAR_WEBHOOK_ERRORS.UNKNOWN_EVENT,
          priority: EventPriority.IGNORE,
          shouldSend: false,
        };
    }
  } catch (error) {
    console.error('Error parsing Linear webhook:', error);
    return {
      message: LINEAR_WEBHOOK_ERRORS.UNKNOWN_EVENT,
      priority: EventPriority.IGNORE,
      shouldSend: false,
    };
  }
};

// Helper function to determine if an event should be sent to Discord
export const shouldSendEvent = (parsedEvent: ParsedEvent): boolean => {
  return (
    parsedEvent.shouldSend && parsedEvent.priority !== EventPriority.IGNORE
  );
};

// Helper function to get the final message with any additional formatting
export const getFinalMessage = (parsedEvent: ParsedEvent): string => {
  if (!shouldSendEvent(parsedEvent)) {
    return '';
  }

  // Add timestamp for high priority events
  if (parsedEvent.priority === EventPriority.HIGH) {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
    return `${parsedEvent.message}\n\n*${timestamp} UTC*`;
  }

  return parsedEvent.message;
};

// Statistics and debugging helpers
export const getEventStats = (
  payload: AnyLinearWebhookPayload
): {
  type: string;
  action: string;
  priority: EventPriority;
  shouldSend: boolean;
} => {
  const parsedEvent = parseLinearWebhook(payload);

  return {
    type: payload.type,
    action: payload.action,
    priority: parsedEvent.priority,
    shouldSend: parsedEvent.shouldSend,
  };
};
