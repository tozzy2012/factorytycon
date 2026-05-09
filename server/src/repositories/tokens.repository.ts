import { eq, lt, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import { db } from '../db';
import { refreshTokens } from '../db/schema';

export class TokensRepository {
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async store(userId: number, token: string, expiresAt: Date): Promise<void> {
    await db.insert(refreshTokens).values({
      userId,
      tokenHash: this.hash(token),
      expiresAt: expiresAt.toISOString(),
    });
  }

  async verify(token: string): Promise<{ userId: number } | null> {
    const row = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.tokenHash, this.hash(token)),
    });
    if (!row) return null;
    if (new Date(row.expiresAt) < new Date()) {
      await this.revoke(token);
      return null;
    }
    return { userId: row.userId };
  }

  async revoke(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, this.hash(token)));
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  async pruneExpired(): Promise<void> {
    await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date().toISOString()));
  }
}
