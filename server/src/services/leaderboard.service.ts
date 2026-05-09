import { LeaderboardRepository } from '../repositories/leaderboard.repository';
import type { LeaderboardEntry } from '../types';

export class LeaderboardService {
  constructor(private repo: LeaderboardRepository) {}

  async getTop(limit = 100): Promise<LeaderboardEntry[]> {
    const rows = await this.repo.getTop(Math.min(limit, 200));
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      username: r.username,
      gold: r.gold,
      era: r.era,
      playTime: r.playTime,
      machinesCount: r.machinesCount,
      recordedAt: r.recordedAt,
    }));
  }

  async getForUser(userId: number): Promise<LeaderboardEntry | null> {
    const top = await this.repo.getTop(200);
    const idx = top.findIndex(r => r.userId === userId);
    if (idx === -1) return null;
    const r = top[idx];
    return {
      rank: idx + 1,
      userId: r.userId,
      username: r.username,
      gold: r.gold,
      era: r.era,
      playTime: r.playTime,
      machinesCount: r.machinesCount,
      recordedAt: r.recordedAt,
    };
  }
}
