import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { errorMiddleware } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import savesRoutes from './routes/saves.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import { TokensRepository } from './repositories/tokens.repository';

const app = express();

// ── Security & parsing ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGIN.split(','),
  credentials: true,
}));
app.use(express.json({ limit: '6mb' }));  // game state can be large
app.use(express.urlencoded({ extended: false }));

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: '1.0.0', uptime: process.uptime() });
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/saves',       savesRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// ── 404 ────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Rota não encontrada.' });
});

// ── Error handler (must be last) ───────────────────────────────────────────
app.use(errorMiddleware);

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = config.PORT;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[server] Industrial Pipeline API running on :${PORT} (${config.NODE_ENV})`);
});

// ── Prune expired refresh tokens every hour ────────────────────────────────
const tokensRepo = new TokensRepository();
setInterval(() => tokensRepo.pruneExpired().catch(console.error), 60 * 60 * 1000);

export default app;
