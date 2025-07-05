import {
  formatCommentBody,
  formatIssueIdentifier,
  formatUser,
} from '../formatters';
import type { CommentWebhookPayload, ParsedEvent } from '../types';
import { EventPriority, LINEAR_WEBHOOK_ERRORS } from '../types';

// Parse comment creation
export const parseCommentCreation = (
  payload: CommentWebhookPayload
): ParsedEvent => {
  const { data: comment, url } = payload;

  const issueId = formatIssueIdentifier(comment.issue);
  const author = formatUser(comment.user);
  const formattedBody = formatCommentBody(comment.body);

  const message = `💬 **${author}** commented on [${issueId} ${comment.issue.title}](${url})\n\n${formattedBody}`;

  return {
    message,
    priority: EventPriority.MEDIUM,
    shouldSend: true,
  };
};

// Parse comment updates
export const parseCommentUpdate = (
  payload: CommentWebhookPayload
): ParsedEvent => {
  const { data: comment, url } = payload;

  const issueId = formatIssueIdentifier(comment.issue);
  const author = formatUser(comment.user);

  const message = `📝 **${author}** updated their comment on [${issueId} ${comment.issue.title}](${url})`;

  return {
    message,
    priority: EventPriority.LOW,
    shouldSend: true,
  };
};

// Main comment parser
export const parseCommentEvent = (
  payload: CommentWebhookPayload
): ParsedEvent => {
  switch (payload.action) {
    case 'create':
      return parseCommentCreation(payload);
    case 'update':
      return parseCommentUpdate(payload);
    case 'remove': {
      // Comment deletions are low priority
      const issueId = formatIssueIdentifier(payload.data.issue);
      const author = formatUser(payload.data.user);

      return {
        message: `🗑️ **${author}** deleted their comment on [${issueId} ${payload.data.issue.title}](${payload.url})`,
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
