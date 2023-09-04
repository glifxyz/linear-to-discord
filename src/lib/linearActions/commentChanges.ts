import type { ICommentData, ILinearData } from '@/@types';

export const createCommentParser = (data: ILinearData<ICommentData>) => {
  const { data: comment, url } = data;
  const { issue, user } = comment;
  const { title } = issue;
  return `**${user.name}** commented on [${title}](${url}):\n> *${comment.body}`;
};
