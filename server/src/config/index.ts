import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV:     z.enum(['development', 'production', 'test']).default('production'),
  PORT:         z.coerce.number().default(3001),
  DB_PATH:      z.string().default('/jogo/server/data/game.db'),
  JWT_SECRET:   z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().default(30),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  CORS_ORIGIN:  z.string().default('http://localhost'),
});

function loadConfig() {
  // Em desenvolvimento, aceita um segredo padrão para facilitar setup local
  if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
    process.env.JWT_SECRET = 'dev-only-secret-not-for-production-use!!';
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('[config] Invalid environment variables:', result.error.flatten());
    console.error('[config] Em produção, defina JWT_SECRET com pelo menos 32 caracteres.');
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
