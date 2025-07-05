import type { NextApiRequest, NextApiResponse } from 'next';

import { sendMessage } from '@/lib/discord';
import {
  getFinalMessage,
  parseLinearWebhook,
  shouldSendEvent,
} from '@/lib/linear/router';
import type { AnyLinearWebhookPayload } from '@/lib/linear/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const payload = req.body as AnyLinearWebhookPayload;

    // Parse the webhook event
    const parsedEvent = parseLinearWebhook(payload);

    // Check if we should send this event
    if (!shouldSendEvent(parsedEvent)) {
      console.log('Event ignored', {
        type: payload.type,
        action: payload.action,
        priority: parsedEvent.priority,
        reason: parsedEvent.message,
      });
      return res.json({ success: true, message: 'Event ignored' });
    }

    // Get the final formatted message
    const finalMessage = getFinalMessage(parsedEvent);

    console.log('Posting message', {
      type: payload.type,
      action: payload.action,
      priority: parsedEvent.priority,
      message: finalMessage,
    });

    // Send to Discord
    await sendMessage(finalMessage);

    return res.json({
      success: true,
      type: payload.type,
      action: payload.action,
      priority: parsedEvent.priority,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);

    return res.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
