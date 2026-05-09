import { Response } from 'express';
import { SavesService } from '../services/saves.service';
import { saveGameSchema } from '../validators/saves.validators';
import type { AuthRequest, ApiResponse } from '../types';

export class SavesController {
  constructor(private savesService: SavesService) {}

  async list(req: AuthRequest, res: Response): Promise<void> {
    const saves = await this.savesService.list(req.user!.sub);
    res.json({ ok: true, data: saves } satisfies ApiResponse);
  }

  async load(req: AuthRequest, res: Response): Promise<void> {
    const slot = parseInt(req.params.slot, 10);
    const save = await this.savesService.load(req.user!.sub, slot);
    res.json({ ok: true, data: save } satisfies ApiResponse);
  }

  async save(req: AuthRequest, res: Response): Promise<void> {
    const slot = parseInt(req.params.slot, 10);
    const body = saveGameSchema.parse(req.body);
    const saved = await this.savesService.save(
      req.user!.sub,
      slot,
      body.stateJson,
      body.name,
      body.thumbnail,
    );
    res.json({ ok: true, data: { id: saved.id, updatedAt: saved.updatedAt } } satisfies ApiResponse);
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const slot = parseInt(req.params.slot, 10);
    await this.savesService.delete(req.user!.sub, slot);
    res.json({ ok: true, message: `Slot ${slot} deletado.` } satisfies ApiResponse);
  }
}
