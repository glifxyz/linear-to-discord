import type { ICommentData, ILinearData } from '@/@types';

function formatAsBlockquote(text: string): string {
  const lines = text.split('\n');
  const prefixedLines = lines.map(line => '> ' + line);
  return prefixedLines.join('\n');
}

export const createCommentParser = (data: ILinearData<ICommentData>) => {
  const { data: comment, url } = data;
  const { issue, user } = comment;
  const { title } = issue;
  return `**${user.name}** commented on [${title}](${url}):\n${formatAsBlockquote(comment.body)}`;
};
