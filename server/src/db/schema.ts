import { sqliteTable, integer, text, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Users ──────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  username:     text('username').notNull().unique(),
  email:        text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl:    text('avatar_url'),
  role:         text('role', { enum: ['player', 'admin'] }).notNull().default('player'),
  createdAt:    text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updatedAt:    text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  deletedAt:    text('deleted_at'),  // soft delete
}, (t) => ({
  usernameIdx: uniqueIndex('users_username_idx').on(t.username),
  emailIdx:    uniqueIndex('users_email_idx').on(t.email),
}));

// ─── Game Saves (5 slots per user) ──────────────────────────────────────────
export const gameSaves = sqliteTable('game_saves', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slot:      integer('slot').notNull(),          // 1–5
  name:      text('name').notNull().default('Partida'),
  version:   integer('version').notNull().default(2),
  // Indexed quick-access fields (denormalized for leaderboard queries)
  gold:      real('gold').notNull().default(0),
  era:       integer('era').notNull().default(0),
  playTime:  real('play_time').notNull().default(0),  // seconds
  machinesCount: integer('machines_count').notNull().default(0),
  // Full state blob
  stateJson: text('state_json').notNull(),
  // Preview thumbnail (base64 mini-canvas PNG)
  thumbnail: text('thumbnail'),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => ({
  userSlotIdx: uniqueIndex('game_saves_user_slot_idx').on(t.userId, t.slot),
  userIdx:     index('game_saves_user_idx').on(t.userId),
}));

// ─── Leaderboard snapshots ───────────────────────────────────────────────────
export const leaderboard = sqliteTable('leaderboard', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  userId:       integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  username:     text('username').notNull(),   // denormalized for read performance
  gold:         real('gold').notNull().default(0),
  era:          integer('era').notNull().default(0),
  playTime:     real('play_time').notNull().default(0),
  machinesCount: integer('machines_count').notNull().default(0),
  recordedAt:   text('recorded_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => ({
  goldIdx:   index('leaderboard_gold_idx').on(t.gold),
  userIdx:   index('leaderboard_user_idx').on(t.userId),
}));

// ─── Achievements ────────────────────────────────────────────────────────────
export const achievements = sqliteTable('achievements', {
  id:             integer('id').primaryKey({ autoIncrement: true }),
  userId:         integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementKey: text('achievement_key').notNull(),
  unlockedAt:     text('unlocked_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => ({
  userAchievementIdx: uniqueIndex('achievements_user_key_idx').on(t.userId, t.achievementKey),
}));

// ─── Refresh tokens (for JWT rotation) ──────────────────────────────────────
export const refreshTokens = sqliteTable('refresh_tokens', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => ({
  tokenHashIdx: uniqueIndex('refresh_tokens_hash_idx').on(t.tokenHash),
  userIdx:      index('refresh_tokens_user_idx').on(t.userId),
}));

export type User         = typeof users.$inferSelect;
export type NewUser      = typeof users.$inferInsert;
export type GameSave     = typeof gameSaves.$inferSelect;
export type NewGameSave  = typeof gameSaves.$inferInsert;
export type Leaderboard  = typeof leaderboard.$inferSelect;
export type Achievement  = typeof achievements.$inferSelect;
