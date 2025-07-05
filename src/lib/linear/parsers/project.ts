import {
  formatDate,
  formatProgress,
  formatProjectLink,
  formatUser,
} from '../formatters';
import type { ParsedEvent, ProjectWebhookPayload } from '../types';
import { EventPriority, LINEAR_WEBHOOK_ERRORS } from '../types';

// Parse project creation
export const parseProjectCreation = (
  payload: ProjectWebhookPayload
): ParsedEvent => {
  const { data: project, url } = payload;

  const projectLink = formatProjectLink(project, url);
  const creator = formatUser(project.creator);

  let message = `🚨 **New Project Created**\n${projectLink}`;
  message += `\n*Created by ${creator}*`;

  // Add lead if different from creator
  if (project.lead && project.lead.id !== project.creator.id) {
    message += `\n*Lead: ${formatUser(project.lead)}*`;
  }

  // Add target date if set
  if (project.targetDate) {
    message += `\n*Target: ${formatDate(project.targetDate)}*`;
  }

  // Add teams
  if (project.teams.length > 0) {
    const teams = project.teams.map((team) => team.name).join(', ');
    message += `\n*Teams: ${teams}*`;
  }

  return {
    message,
    priority: EventPriority.HIGH,
    shouldSend: true,
  };
};

// Parse project updates
export const parseProjectUpdate = (
  payload: ProjectWebhookPayload
): ParsedEvent => {
  const { data: project, url, updatedFrom } = payload;

  if (!updatedFrom) {
    return {
      message: LINEAR_WEBHOOK_ERRORS.MISSING_DATA,
      priority: EventPriority.IGNORE,
      shouldSend: false,
    };
  }

  const projectLink = formatProjectLink(project, url);

  // Handle state changes (most important)
  if (updatedFrom.state && updatedFrom.state !== project.state) {
    if (project.state === 'completed') {
      return {
        message: `🎉 **Project Completed**\n${projectLink}\n*Progress: ${formatProgress(
          project.progress
        )}*`,
        priority: EventPriority.HIGH,
        shouldSend: true,
      };
    }

    if (project.state === 'canceled') {
      return {
        message: `❌ **Project Canceled**\n${projectLink}`,
        priority: EventPriority.HIGH,
        shouldSend: true,
      };
    }

    if (project.state === 'started') {
      return {
        message: `🚀 **Project Started**\n${projectLink}`,
        priority: EventPriority.HIGH,
        shouldSend: true,
      };
    }

    return {
      message: `📢 **Project Status Changed**\n${projectLink}\n*Status: ${project.state}*`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  // Handle lead changes
  if (
    updatedFrom.leadId !== undefined &&
    updatedFrom.leadId !== project.leadId
  ) {
    const newLead = project.lead ? formatUser(project.lead) : 'Unassigned';

    return {
      message: `📢 **Project Lead Changed**\n${projectLink}\n*New lead: ${newLead}*`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  // Handle target date changes
  if (
    updatedFrom.targetDate !== undefined &&
    updatedFrom.targetDate !== project.targetDate
  ) {
    const targetText = project.targetDate
      ? `Target: ${formatDate(project.targetDate)}`
      : 'Target date removed';

    return {
      message: `📢 **Project Target Date Changed**\n${projectLink}\n*${targetText}*`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  // Handle significant progress changes (>10%)
  if (
    updatedFrom.progress !== undefined &&
    Math.abs(project.progress - updatedFrom.progress) > 0.1
  ) {
    const progressText = formatProgress(project.progress);

    return {
      message: `📊 **Project Progress Update**\n${projectLink}\n*Progress: ${progressText}*`,
      priority: EventPriority.MEDIUM,
      shouldSend: true,
    };
  }

  // Handle name changes
  if (updatedFrom.name && updatedFrom.name !== project.name) {
    return {
      message: `📢 **Project Renamed**\n${projectLink}\n*was: "${updatedFrom.name}"*`,
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

// Main project parser
export const parseProjectEvent = (
  payload: ProjectWebhookPayload
): ParsedEvent => {
  switch (payload.action) {
    case 'create':
      return parseProjectCreation(payload);
    case 'update':
      return parseProjectUpdate(payload);
    case 'remove':
      return {
        message: `🗑️ **Project Deleted**\n${formatProjectLink(
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
