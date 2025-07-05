import { formatCycleLink, formatDate, formatProgress } from '../formatters';
import type { CycleWebhookPayload, ParsedEvent } from '../types';
import { EventPriority, LINEAR_WEBHOOK_ERRORS } from '../types';

// Parse cycle creation
export const parseCycleCreation = (
  payload: CycleWebhookPayload
): ParsedEvent => {
  const { data: cycle, url } = payload;

  const cycleLink = formatCycleLink(cycle, url);
  const startDate = formatDate(cycle.startDate);
  const endDate = formatDate(cycle.endDate);

  let message = `🚨 **New Cycle Created**\n${cycleLink}`;
  message += `\n*Team: ${cycle.team.name}*`;
  message += `\n*Duration: ${startDate} → ${endDate}*`;

  return {
    message,
    priority: EventPriority.HIGH,
    shouldSend: true,
  };
};

// Parse cycle updates
export const parseCycleUpdate = (payload: CycleWebhookPayload): ParsedEvent => {
  const { data: cycle, url, updatedFrom } = payload;

  if (!updatedFrom) {
    return {
      message: LINEAR_WEBHOOK_ERRORS.MISSING_DATA,
      priority: EventPriority.IGNORE,
      shouldSend: false,
    };
  }

  const cycleLink = formatCycleLink(cycle, url);

  // Handle cycle completion
  if (updatedFrom.completedAt === null && cycle.completedAt) {
    const progress = formatProgress(cycle.progress);

    return {
      message: `🎉 **Cycle Completed**\n${cycleLink}\n*Final progress: ${progress}*`,
      priority: EventPriority.HIGH,
      shouldSend: true,
    };
  }

  // Handle significant progress changes (>15%)
  if (
    updatedFrom.progress !== undefined &&
    Math.abs(cycle.progress - updatedFrom.progress) > 0.15
  ) {
    const progress = formatProgress(cycle.progress);

    return {
      message: `📊 **Cycle Progress Update**\n${cycleLink}\n*Progress: ${progress}*`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  // Handle name changes
  if (updatedFrom.name && updatedFrom.name !== cycle.name) {
    return {
      message: `📢 **Cycle Renamed**\n${cycleLink}\n*was: "${updatedFrom.name}"*`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  // Handle date changes
  if (
    updatedFrom.startDate !== cycle.startDate ||
    updatedFrom.endDate !== cycle.endDate
  ) {
    const startDate = formatDate(cycle.startDate);
    const endDate = formatDate(cycle.endDate);

    return {
      message: `📢 **Cycle Dates Changed**\n${cycleLink}\n*New duration: ${startDate} → ${endDate}*`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  // Ignore other minor updates
  return {
    message: LINEAR_WEBHOOK_ERRORS.IGNORED_EVENT,
    priority: EventPriority.IGNORE,
    shouldSend: false,
  };
};

// Main cycle parser
export const parseCycleEvent = (payload: CycleWebhookPayload): ParsedEvent => {
  switch (payload.action) {
    case 'create':
      return parseCycleCreation(payload);
    case 'update':
      return parseCycleUpdate(payload);
    case 'remove':
      return {
        message: `🗑️ **Cycle Deleted**\n${formatCycleLink(
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
