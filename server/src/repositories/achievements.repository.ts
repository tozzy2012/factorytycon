import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { achievements, type Achievement } from '../db/schema';

export class AchievementsRepository {
  async listByUser(userId: number): Promise<Achievement[]> {
    return db.query.achievements.findMany({
      where: eq(achievements.userId, userId),
      orderBy: [achievements.unlockedAt],
    });
  }

  async unlock(userId: number, key: string): Promise<Achievement | null> {
    const existing = await db.query.achievements.findFirst({
      where: and(eq(achievements.userId, userId), eq(achievements.achievementKey, key)),
    });
    if (existing) return null;  // already unlocked
    const [row] = await db.insert(achievements).values({ userId, achievementKey: key }).returning();
    return row;
  }
}
