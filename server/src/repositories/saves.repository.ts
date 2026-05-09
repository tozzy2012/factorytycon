import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { gameSaves, type GameSave, type NewGameSave } from '../db/schema';

export class SavesRepository {
  async listByUser(userId: number): Promise<GameSave[]> {
    return db.query.gameSaves.findMany({
      where: eq(gameSaves.userId, userId),
      columns: {
        id: true, userId: true, slot: true, name: true, version: true,
        gold: true, era: true, playTime: true, machinesCount: true,
        thumbnail: true, createdAt: true, updatedAt: true,
        stateJson: false,  // exclude heavy blob from list
      },
    }) as unknown as GameSave[];
  }

  async findBySlot(userId: number, slot: number): Promise<GameSave | undefined> {
    return db.query.gameSaves.findFirst({
      where: and(eq(gameSaves.userId, userId), eq(gameSaves.slot, slot)),
    });
  }

  async upsert(data: Omit<NewGameSave, 'id' | 'createdAt' | 'updatedAt'>): Promise<GameSave> {
    const existing = await this.findBySlot(data.userId, data.slot);
    if (existing) {
      const [row] = await db
        .update(gameSaves)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(and(eq(gameSaves.userId, data.userId), eq(gameSaves.slot, data.slot)))
        .returning();
      return row;
    }
    const [row] = await db.insert(gameSaves).values(data).returning();
    return row;
  }

  async deleteBySlot(userId: number, slot: number): Promise<boolean> {
    const result = await db
      .delete(gameSaves)
      .where(and(eq(gameSaves.userId, userId), eq(gameSaves.slot, slot)))
      .returning();
    return result.length > 0;
  }
}
