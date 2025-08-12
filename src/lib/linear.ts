import type { ILinearData } from '@/@types';
import { ERRORS } from '@/config/appConstants';

import { createCommentParser } from './linearActions/commentChanges';
import {
  createIssueParser,
  updateIssueParser,
} from './linearActions/issueChanges';
import {
  createProjectParser,
  createProjectUpdateParser,
  updateProjectParser,
  updateProjectUpdateParser,
} from './linearActions/projectChanges';

export const parseData = (data: ILinearData<any>): string => {
  const { action, type } = data;
  switch (action) {
    case 'create':
      if (type === 'Issue') return createIssueParser(data);
      if (type === 'Comment') return createCommentParser(data);
      if (type === 'Project') return createProjectParser(data);
      if (type === 'ProjectUpdate') return createProjectUpdateParser(data);
      return ERRORS.UNKNOWN_ACTION;
    case 'update':
      if (type === 'Issue') return updateIssueParser(data);
      if (type === 'Project') return updateProjectParser(data);
      if (type === 'ProjectUpdate') return updateProjectUpdateParser(data);
      return ERRORS.UNKNOWN_ACTION;
    default:
      return ERRORS.UNKNOWN_ACTION;
  }
};
