import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { leaderboard, type Leaderboard } from '../db/schema';

export class LeaderboardRepository {
  async getTop(limit = 100): Promise<Leaderboard[]> {
    return db.query.leaderboard.findMany({
      orderBy: [desc(leaderboard.gold)],
      limit,
    });
  }

  async findByUser(userId: number): Promise<Leaderboard | undefined> {
    return db.query.leaderboard.findFirst({
      where: eq(leaderboard.userId, userId),
    });
  }

  async upsert(data: Omit<Leaderboard, 'id' | 'recordedAt'>): Promise<Leaderboard> {
    const existing = await this.findByUser(data.userId);
    if (existing) {
      const [row] = await db
        .update(leaderboard)
        .set({ ...data, recordedAt: new Date().toISOString() })
        .where(eq(leaderboard.userId, data.userId))
        .returning();
      return row;
    }
    const [row] = await db.insert(leaderboard).values(data).returning();
    return row;
  }
}
