import type { IssueSlaWebhookPayload, ParsedEvent } from '../types';
import { EventPriority } from '../types';

// Parse SLA events (these are typically high priority)
export const parseSlaEvent = (payload: IssueSlaWebhookPayload): ParsedEvent => {
  const { data: sla, url } = payload;

  // SLA breaches are always high priority
  if (sla.breachedAt) {
    return {
      message: `🚨 **SLA Breach Alert**\n[${
        sla.name
      }](${url})\n*Breached at: ${new Date(sla.breachedAt).toLocaleString()}*`,
      priority: EventPriority.HIGH,
      shouldSend: true,
    };
  }

  // Other SLA events are medium priority
  return {
    message: `⚠️ **SLA Event**\n[${sla.name}](${url})`,
    priority: EventPriority.MEDIUM,
    shouldSend: true,
  };
};
