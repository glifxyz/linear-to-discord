import type { ILinearData, IProjectData, IProjectUpdateData } from '@/@types';

const getHealthEmoji = (health: string): string => {
  switch (health) {
    case 'onTrack':
      return '🟢';
    case 'atRisk':
      return '🟡';
    case 'offTrack':
      return '🔴';
    case 'completed':
      return '✅';
    default:
      return '⚪';
  }
};

const getHealthText = (health: string): string => {
  switch (health) {
    case 'onTrack':
      return 'On Track';
    case 'atRisk':
      return 'At Risk';
    case 'offTrack':
      return 'Off Track';
    case 'completed':
      return 'Completed';
    default:
      return 'Unknown';
  }
};

const truncateText = (text: string, maxLength: number = 150): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const createProjectParser = (
  data: ILinearData<IProjectData>
): string => {
  const { data: project, url } = data;
  const { name, description, lead } = project;

  let message = `**📊 New Project Created:** [${name}](${url})`;

  if (lead) {
    message += `\n**Lead:** ${lead.name}`;
  }

  if (description) {
    message += `\n**Description:** ${truncateText(description, 100)}`;
  }

  return message;
};

export const updateProjectParser = (
  data: ILinearData<IProjectData>
): string => {
  const { data: project, url } = data;
  const { name, status } = project;

  return `**📊 Project Updated:** [${name}](${url}) - Status: **${status}**`;
};

export const createProjectUpdateParser = (
  data: ILinearData<IProjectUpdateData>
): string => {
  const { data: projectUpdate, url } = data;
  const { project, user, health, body } = projectUpdate;

  const healthEmoji = getHealthEmoji(health);
  const healthText = getHealthText(health);

  let message = `${healthEmoji} **Project Update:** [${project.name}](${project.url})\n`;
  message += `**Author:** ${user.name}\n`;
  message += `**Status:** ${healthText}\n`;

  if (body) {
    const cleanBody = body.replace(/\n/g, ' ').trim();
    message += `**Update:** ${truncateText(cleanBody, 200)}\n`;
  }

  message += `[View full update](${url})`;

  return message;
};

export const updateProjectUpdateParser = (
  data: ILinearData<IProjectUpdateData>
): string => {
  const { data: projectUpdate, url } = data;
  const { project, user, health } = projectUpdate;

  const healthEmoji = getHealthEmoji(health);
  const healthText = getHealthText(health);

  return `${healthEmoji} **Project Update Modified:** [${project.name}](${project.url}) by ${user.name} - Status: **${healthText}** | [View update](${url})`;
};
