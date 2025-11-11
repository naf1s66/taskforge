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
