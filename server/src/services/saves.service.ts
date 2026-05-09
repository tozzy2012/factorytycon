import { AppError } from './auth.service';
import { SavesRepository } from '../repositories/saves.repository';
import { LeaderboardRepository } from '../repositories/leaderboard.repository';
import { UsersRepository } from '../repositories/users.repository';

const MAX_SLOTS = 5;
const MAX_STATE_BYTES = 5 * 1024 * 1024; // 5MB limit per save

interface GameStateBlob {
  gold?: number;
  era?: number;
  stats?: { playTime?: number };
  machines?: unknown[];
  [key: string]: unknown;
}

export class SavesService {
  constructor(
    private savesRepo: SavesRepository,
    private leaderboardRepo: LeaderboardRepository,
    private usersRepo: UsersRepository,
  ) {}

  async list(userId: number) {
    return this.savesRepo.listByUser(userId);
  }

  async load(userId: number, slot: number) {
    this.#validateSlot(slot);
    const save = await this.savesRepo.findBySlot(userId, slot);
    if (!save) throw new AppError(404, `Slot ${slot} vazio.`);
    return save;
  }

  async save(userId: number, slot: number, stateJson: string, name?: string, thumbnail?: string) {
    this.#validateSlot(slot);

    if (Buffer.byteLength(stateJson, 'utf8') > MAX_STATE_BYTES) {
      throw new AppError(413, 'Save state excede o limite de 5MB.');
    }

    let state: GameStateBlob;
    try {
      state = JSON.parse(stateJson) as GameStateBlob;
    } catch {
      throw new AppError(400, 'Estado de jogo inválido (JSON malformado).');
    }

    const gold = typeof state.gold === 'number' ? state.gold : 0;
    const era = typeof state.era === 'number' ? state.era : 0;
    const playTime = state.stats?.playTime ?? 0;
    const machinesCount = Array.isArray(state.machines) ? state.machines.length : 0;

    const saved = await this.savesRepo.upsert({
      userId,
      slot,
      name: name ?? `Partida ${slot}`,
      version: (state.saveVersion as number) ?? 2,
      gold,
      era,
      playTime,
      machinesCount,
      stateJson,
      thumbnail: thumbnail ?? null,
    });

    // Auto-submit to leaderboard when saving
    const user = await this.usersRepo.findById(userId);
    if (user) {
      await this.leaderboardRepo.upsert({ userId, username: user.username, gold, era, playTime, machinesCount });
    }

    return saved;
  }

  async delete(userId: number, slot: number) {
    this.#validateSlot(slot);
    const deleted = await this.savesRepo.deleteBySlot(userId, slot);
    if (!deleted) throw new AppError(404, `Slot ${slot} não encontrado.`);
  }

  #validateSlot(slot: number) {
    if (!Number.isInteger(slot) || slot < 1 || slot > MAX_SLOTS) {
      throw new AppError(400, `Slot deve ser entre 1 e ${MAX_SLOTS}.`);
    }
  }
}
