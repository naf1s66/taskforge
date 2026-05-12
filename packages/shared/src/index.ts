export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TaskDTO {
  id?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  tags?: string[];
}

export interface TaskRecordDTO {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskBoardItemDTO {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  dueDate?: string;
  tags: string[];
  updatedAt: string;
}

export interface TagDTO {
  id: string;
  label: string;
}

export interface TagCreateDTO {
  label: string;
}

export interface TagListItemDTO {
  label: string;
  count: number;
}

export interface TagSummaryDTO {
  label: string;
  count: number;
}

export interface BoardColumnDTO {
  status: TaskStatus;
  title: string;
  order: number;
  tasks: TaskBoardItemDTO[];
  total: number;
  overdueCount: number;
  tags: TagSummaryDTO[];
}

export interface BoardSummaryDTO {
  totalsByStatus: Record<TaskStatus, number>;
  overdueByStatus: Record<TaskStatus, number>;
  totalTasks: number;
  totalOverdue: number;
}

export interface BoardReadModelDTO {
  columns: BoardColumnDTO[];
  summary: BoardSummaryDTO;
  updatedAt: string;
  generatedAt: string;
}

export interface BoardMoveRequestDTO {
  taskId: string;
  targetStatus: TaskStatus;
  targetIndex: number;
}

export interface AuthUserDTO {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthTokensDTO {
  tokenType: 'Bearer';
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface AuthSuccessResponseDTO {
  user: AuthUserDTO;
  tokens: AuthTokensDTO;
}

export interface AuthMeResponseDTO {
  user: AuthUserDTO | null;
}

export { resolveCookieDomain, getSessionCookieName } from './auth/cookies';
