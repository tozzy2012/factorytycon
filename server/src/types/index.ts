import { Request } from 'express';

export interface AuthPayload {
  sub: number;        // user id
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  gold: number;
  era: number;
  playTime: number;
  machinesCount: number;
  recordedAt: string;
}
