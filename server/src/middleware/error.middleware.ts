import { Request, Response, NextFunction } from 'express';
import { AppError } from '../services/auth.service';
import { ZodError } from 'zod';

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ ok: false, error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    res.status(400).json({ ok: false, error: `Validação: ${messages}` });
    return;
  }

  console.error('[server] Unhandled error:', err);
  res.status(500).json({ ok: false, error: 'Erro interno do servidor.' });
}

export function asyncWrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
