import {
  formatCommentBody,
  formatProjectHealth,
  formatProjectLink,
  formatUser,
} from '../formatters';
import type { ParsedEvent, ProjectUpdateWebhookPayload } from '../types';
import { EventPriority, LINEAR_WEBHOOK_ERRORS } from '../types';

// Parse project update creation
export const parseProjectUpdateCreation = (
  payload: ProjectUpdateWebhookPayload
): ParsedEvent => {
  const { data: update, url } = payload;

  const projectLink = formatProjectLink(update.project, url);
  const author = formatUser(update.user);
  const health = formatProjectHealth(update.health);
  const formattedBody = formatCommentBody(update.body, 150);

  // Health status determines priority
  let priority = EventPriority.MEDIUM;
  let icon = '📝';

  if (update.health === 'offTrack') {
    priority = EventPriority.HIGH;
    icon = '🚨';
  } else if (update.health === 'atRisk') {
    priority = EventPriority.MEDIUM;
    icon = '⚠️';
  }

  const message = `${icon} **Project Update**\n${projectLink}\n*by ${author}* • ${health}\n\n${formattedBody}`;

  return {
    message,
    priority,
    shouldSend: true,
  };
};

// Parse project update modifications
export const parseProjectUpdateModification = (
  payload: ProjectUpdateWebhookPayload
): ParsedEvent => {
  const { data: update, url } = payload;

  const projectLink = formatProjectLink(update.project, url);
  const author = formatUser(update.user);

  const message = `📝 **${author}** updated their project update for ${projectLink}`;

  return {
    message,
    priority: EventPriority.LOW,
    shouldSend: true,
  };
};

// Main project update parser
export const parseProjectUpdateEvent = (
  payload: ProjectUpdateWebhookPayload
): ParsedEvent => {
  switch (payload.action) {
    case 'create':
      return parseProjectUpdateCreation(payload);
    case 'update':
      return parseProjectUpdateModification(payload);
    case 'remove': {
      const projectLink = formatProjectLink(payload.data.project, payload.url);
      const author = formatUser(payload.data.user);

      return {
        message: `🗑️ **${author}** deleted their project update for ${projectLink}`,
        priority: EventPriority.LOW,
        shouldSend: true,
      };
    }
    default:
      return {
        message: LINEAR_WEBHOOK_ERRORS.UNSUPPORTED_ACTION,
        priority: EventPriority.IGNORE,
        shouldSend: false,
      };
  }
};
