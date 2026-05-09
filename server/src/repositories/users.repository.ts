import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db';
import { users, type NewUser, type User } from '../db/schema';

export class UsersRepository {
  async findById(id: number): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: and(eq(users.email, email), isNull(users.deletedAt)),
    });
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: and(eq(users.username, username), isNull(users.deletedAt)),
    });
  }

  async create(data: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<User> {
    const [row] = await db.insert(users).values(data).returning();
    return row;
  }

  async updateById(id: number, data: Partial<Pick<User, 'username' | 'email' | 'avatarUrl'>>): Promise<User | undefined> {
    const [row] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return row;
  }

  async softDeleteById(id: number): Promise<void> {
    await db
      .update(users)
      .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(users.id, id));
  }
}
