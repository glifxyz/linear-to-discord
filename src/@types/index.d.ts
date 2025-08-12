export interface ILinearData<T> {
  action: 'create' | 'update';
  createdAt: Date;
  data: T;
  url: string;
  type: 'Issue' | 'Comment' | 'Project' | 'ProjectUpdate';
  organizationId: string;
  webhookTimestamp: number;
}
export type IIssueFields =
  | 'title'
  | 'description'
  | 'priority'
  | 'stateId'
  | 'teamId'
  | 'labelIds'
  | 'assigneeId'
  | 'parentIssueId'
  | 'startDate'
  | 'dueDate'
  | 'estimate';

export interface ILinearUpdateData<T> extends ILinearData<T> {
  updatedFrom?: IUpdatedFrom & { [key in IIssueFields]: string };
}

export interface IIssueData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  number: number;
  title: string;
  priority: number;
  boardOrder: number;
  sortOrder: number;
  teamId: string;
  previousIdentifiers: any[];
  creatorId: string;
  stateId: string;
  priorityLabel: string;
  subscriberIds: string[];
  labels: IIssueLabel[];
  labelIds: string[];
  state: IIssueState;
  team: ITeam;
  assignee: IUser;
  assigneeId?: string;
  labels: any[];
}

export interface ICommentData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  body: string;
  issueId: string;
  userId: string;
  reactionData: any[];
  issue: ICommentIssue;
  user: IUser;
}

export interface ICommentIssue {
  id: string;
  title: string;
}

export interface IIssueLabel {
  id: string;
  name: string;
  color: string;
}

export interface IUser {
  id: string;
  name: string;
}

export interface IIssueState {
  id: string;
  color: string;
  name: string;
  type: string;
}

export interface ITeam {
  id: string;
  key: string;
  name: string;
}

export interface IUpdatedFrom {
  updatedAt: Date;
  sortOrder: number;
  completedAt: null;
  stateId: string;
  labelIds: string[];
}

export interface IProjectData {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: number;
  color: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  targetDate?: Date;
  completedAt?: Date;
  canceledAt?: Date;
  teams: ITeam[];
  lead?: IUser;
  members: IUser[];
  url: string;
}

export interface IProjectUpdateData {
  id: string;
  body: string;
  bodyData?: string;
  health: 'onTrack' | 'atRisk' | 'offTrack' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  project: {
    id: string;
    name: string;
    url: string;
    status: string;
    color: string;
    icon?: string;
  };
  user: IUser;
  url: string;
}
