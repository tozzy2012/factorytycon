import { Request, Response } from 'express';
import { LeaderboardService } from '../services/leaderboard.service';
import type { AuthRequest, ApiResponse } from '../types';

export class LeaderboardController {
  constructor(private service: LeaderboardService) {}

  async getTop(req: Request, res: Response): Promise<void> {
    const raw = parseInt((req.query.limit as string) || '100', 10);
    const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 200) : 100;
    const entries = await this.service.getTop(limit);
    res.json({ ok: true, data: entries } satisfies ApiResponse);
  }

  async getMyRank(req: AuthRequest, res: Response): Promise<void> {
    const entry = await this.service.getForUser(req.user!.sub);
    res.json({ ok: true, data: entry } satisfies ApiResponse);
  }
}
