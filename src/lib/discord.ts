import axios from 'axios';

import { env } from '@/config/env';

export const sendMessage = (
  message: string,
  isProjectUpdate: boolean = false
) => {
  // Use project-specific webhook if available and this is a project update
  const webhookUrl =
    isProjectUpdate && env.DISCORD_WEBHOOK_PROJECTS
      ? env.DISCORD_WEBHOOK_PROJECTS
      : env.DISCORD_WEBHOOK;

  return axios({
    url: webhookUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: { content: message },
  }).then((res: any) => res.data);
};
