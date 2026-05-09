import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema, refreshSchema } from '../validators/auth.validators';
import type { AuthRequest, ApiResponse } from '../types';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(req: Request, res: Response): Promise<void> {
    const body = registerSchema.parse(req.body);
    const tokens = await this.authService.register(body.username, body.email, body.password);
    res.status(201).json({ ok: true, data: tokens } satisfies ApiResponse);
  }

  async login(req: Request, res: Response): Promise<void> {
    const body = loginSchema.parse(req.body);
    const tokens = await this.authService.login(body.emailOrUsername, body.password);
    res.json({ ok: true, data: tokens } satisfies ApiResponse);
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const body = refreshSchema.parse(req.body);
    const tokens = await this.authService.refresh(body.refreshToken);
    res.json({ ok: true, data: tokens } satisfies ApiResponse);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const body = refreshSchema.safeParse(req.body);
    if (body.success) await this.authService.logout(body.data.refreshToken);
    res.json({ ok: true, message: 'Logout realizado.' } satisfies ApiResponse);
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    const user = await this.authService.me(req.user!.sub);
    res.json({ ok: true, data: user } satisfies ApiResponse);
  }
}
