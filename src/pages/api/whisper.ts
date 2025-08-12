import type { NextApiRequest, NextApiResponse } from 'next';

import { ERRORS } from '@/config/appConstants';
import { sendMessage } from '@/lib/discord';
import { parseData } from '@/lib/linear';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const data = req.body;
  const message = parseData(data);
  if (message === ERRORS.UNKNOWN_ACTION) {
    console.log('Unknown action', { data, message });
    return res.json({ success: false, message: ERRORS.UNKNOWN_ACTION });
  } else if (message === ERRORS.ACTION_IGNORED) {
    console.log('Action ignored', { data, message });
    return res.json({ success: false, message: ERRORS.ACTION_IGNORED });
  }

  // Check if this is a project-related update
  const isProjectUpdate =
    data.type === 'Project' || data.type === 'ProjectUpdate';

  console.log('Posting message', { data, message, isProjectUpdate });
  return sendMessage(message, isProjectUpdate)
    .then(() => res.json({ success: true }))
    .catch((err: any) => res.json({ success: false, message: err.message }));
}
