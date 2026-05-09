import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './index';
import path from 'path';

const migrationsFolder = path.resolve(__dirname, '../../drizzle/migrations');

console.log('[migrate] Running migrations from', migrationsFolder);
migrate(db, { migrationsFolder });
console.log('[migrate] Done.');

process.exit(0);
